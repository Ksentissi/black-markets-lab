import dash
from dash import dcc, html
import plotly.graph_objs as go
import numpy as np
from dash.dependencies import Input, Output
from flask import jsonify
from flask_cors import CORS
from calculs import simulate_stock_prices


# Initialisation de l'application Dash
app = dash.Dash(__name__)
server = app.server
CORS(
    server,
    resources={
        r"/api/*": {
            "origins": [
                "http://localhost:5173",
                "http://127.0.0.1:5173",
            ],
            "supports_credentials": False,
        }
    },
)


# Paramètres de la simulation
time = 2  # Durée de la simulation (2 ans)
this_num_simulations = 5  # Nombre de trajectoires simulées
this_num_steps = 252  # Nombre de pas de temps (correspond à 252 jours de bourse)


# ---- 1) Simulation initiale pour l'interface Dash ----
simulated_prices, fixed_volatilities = simulate_stock_prices(
    num_simulations=this_num_simulations,
    time=time,
    num_steps=this_num_steps,
)


# ---- 3) Noms des actions ----
names = ["Apple", "Microsoft", "Google", "Amazon", "Facebook", "Tesla", "Netflix", "Nvidia"]

# ---- Metadonnées et événements ----
STOCK_METADATA = {
    "Apple": {
        "risk": "Low", 
        "industry": "Consumer Electronics", 
        "trend": "Stable growth due to high iPhone demand."
    },
    "Microsoft": {
        "risk": "Low", 
        "industry": "Software & Cloud", 
        "trend": "Strong cloud performance driving steady gains."
    },
    "Google": {
        "risk": "Medium", 
        "industry": "Internet Services", 
        "trend": "Ad revenue fluctuations impacting short-term price."
    },
    "Amazon": {
        "risk": "Medium", 
        "industry": "E-commerce", 
        "trend": "Logistics expansion increasing operational costs."
    },
    "Facebook": {
        "risk": "High", 
        "industry": "Social Media", 
        "trend": "Regulatory scrutiny causing market uncertainty."
    },
    "Tesla": {
        "risk": "Very High", 
        "industry": "Automotive", 
        "trend": "High volatility driven by EV market speculation."
    },
    "Netflix": {
        "risk": "High", 
        "industry": "Entertainment", 
        "trend": "Subscriber growth slowing down in key regions."
    },
    "Nvidia": {
        "risk": "High", 
        "industry": "Semiconductors", 
        "trend": "AI boom driving massive but volatile growth."
    }
}

EVENTS_DATABASE = [
    {
        "id": 1,
        "title": "Earnings Report Leak",
        "description": "This company has reported excellent earnings.",
        "impact": "positive",
        "cost": 100000,
        "magnitude": 1.15  # 15% jump
    },
    {
        "id": 2,
        "title": "Market Sector Entry",
        "description": "The company is about to enter a new market sector.",
        "impact": "volatile",
        "cost": 100000,
        "magnitude": 1.25 # Higher volatility
    },
    {
        "id": 3,
        "title": "Disappointing Report",
        "description": "This company has underperformed in its latest earnings report.",
        "impact": "negative",
        "cost": 100000,
        "magnitude": 0.85 # 15% drop
    }
]

def build_dash_figure(step=None):
    if step is None:
        step = this_num_steps

    trace = []
    for i in range(this_num_simulations):
        initial_price = simulated_prices[i, 0]
        volatility = fixed_volatilities[i]

        legend_text = (
            f"{names[i]}<br>Prix Initial: {initial_price:.2f}"
            f"<br>Volatilité: {volatility:.2f}"
        )

        trace.append(
            go.Scatter(
                x=np.linspace(0, time, this_num_steps),
                y=simulated_prices[i, :step],
                mode='lines',
                name=legend_text,
                showlegend=True,
            ),
        )

    layout = go.Layout(
        title="Stock Price Simulation (Black-Scholes Model)",
        xaxis={'title': 'Time (years)', 'range': [0, time]},
        yaxis={'title': "Stock Price", 'range': [0, simulated_prices.max() * 1.2]},
        showlegend=True,
    )

    return go.Figure(data=trace, layout=layout)


def generate_rest_payload():
    prices, volatilities = simulate_stock_prices(
        num_simulations=this_num_simulations,
        time=time,
        num_steps=this_num_steps,
    )
    timeline = np.linspace(0, time, this_num_steps)

    series = [
        {
            "name": names[i],
            "volatility": float(volatilities[i]),
            "values": prices[i].tolist(),
        }
        for i in range(this_num_simulations)
    ]

    max_y = float(prices.max() * 1.2)

    return {
        "timestamps": timeline.tolist(),
        "series": series,
        "max_y": max_y,
    }


# ---- 4–6) Application Dash ----
fig = build_dash_figure()

app.layout = html.Div([
    html.H1("Simulation du Modèle de Black-Scholes", style={'text-align': 'center'}),
    dcc.Graph(id='stock-price-graph', figure=fig),
    dcc.Interval(id='interval-component', interval=100, n_intervals=0),
])


@app.callback(
    Output('stock-price-graph', 'figure'),
    Input('interval-component', 'n_intervals'),
)
def update_graph(n_intervals):
    # Limite mini : éviter index out of range
    step = min(n_intervals + 1, this_num_steps)
    return build_dash_figure(step=step)


@server.route('/api/simulate', methods=['GET', 'POST'])
def api_simulate():
    """
    Endpoint REST utilisé par l'interface React.
    Retourne une simulation complète avec timestamps et séries.
    Accepte une requête POST avec les actions sélectionnées ou configurées.
    """
    from flask import request
    
    stock_configs = []
    output_names = []
    
    if request.method == 'POST':
        data = request.get_json() or {}
        stocks_input = data.get('stocks', [])
        # Default to 252 if not provided
        steps = data.get('num_steps', this_num_steps)
        
        # Check if input is a list of objects (new format) or strings (old format)
        if stocks_input and isinstance(stocks_input[0], dict):
            # New format: [{"name": "Apple", "volatility": 0.2, "initial_price": 100}, ...]
            for stock in stocks_input:
                name = stock.get('name', 'Unknown')
                output_names.append(name)
                
                config = {}
                if 'initial_price' in stock:
                    config['initial_price'] = float(stock['initial_price'])
                if 'volatility' in stock:
                    config['volatility'] = float(stock['volatility'])
                stock_configs.append(config)
        
        elif stocks_input and isinstance(stocks_input[0], str):
            # Old format: ["Apple", "Google"]
            # Map to indices/defaults if needed, or just treat as names requested
            for name in stocks_input:
                if name in names:
                    output_names.append(name)
                    stock_configs.append({}) # Use default random params
    else:
        steps = this_num_steps
    
    # Fallback if no specific stocks requested: generate all defaults
    if not stock_configs:
        output_names = names
        # Empty configs means use random defaults for this_num_simulations
        prices, volatilities = simulate_stock_prices(
            num_simulations=this_num_simulations,
            time=time,
            num_steps=steps,
            stock_configs=None
        )
    else:
        # Use specific configs
        prices, volatilities = simulate_stock_prices(
            num_simulations=len(stock_configs),
            time=time,
            num_steps=steps,
            stock_configs=stock_configs
        )

    timeline = np.linspace(0, time, steps)
    
    # Build response series
    series = []
    for i in range(len(output_names)):
        # Safety check in case price generation count mismatches
        if i < len(prices):
            series.append({
                "name": output_names[i],
                "volatility": float(volatilities[i]),
                "values": prices[i].tolist(),
                "metadata": STOCK_METADATA.get(output_names[i], {
                    "risk": "Unknown", "industry": "Unknown", "trend": "No data"
                })
            })
    
    # Calculate max_y
    max_y = float(prices.max() * 1.2) if len(prices) > 0 else 1000.0
    
    payload = {
        "timestamps": timeline.tolist(),
        "series": series,
        "max_y": max_y,
        "events": EVENTS_DATABASE # Send available event types
    }
    
    return jsonify(payload)


# ---- 8) Lancer le serveur ----
if __name__ == '__main__':
    app.run(debug=True)
