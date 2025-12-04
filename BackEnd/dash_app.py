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
names = ["Apple", "Microsoft", "Google", "Amazon", "Facebook"]


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
    Accepte une requête POST avec les actions sélectionnées.
    """
    from flask import request
    
    selected_stocks = []
    if request.method == 'POST':
        data = request.get_json() or {}
        selected_stocks = data.get('stocks', [])
    
    # Générer toutes les simulations
    prices, volatilities = simulate_stock_prices(
        num_simulations=this_num_simulations,
        time=time,
        num_steps=this_num_steps,
    )
    timeline = np.linspace(0, time, this_num_steps)
    
    # Filtrer selon les actions sélectionnées
    if selected_stocks and len(selected_stocks) > 0:
        # Créer un mapping des noms vers les indices
        stock_indices = []
        for stock in selected_stocks:
            if stock in names:
                stock_indices.append(names.index(stock))
        
        # Si aucune action valide n'est sélectionnée, retourner toutes
        if not stock_indices:
            stock_indices = list(range(this_num_simulations))
    else:
        # Si aucune sélection, retourner toutes les actions
        stock_indices = list(range(this_num_simulations))
    
    # Créer les séries uniquement pour les actions sélectionnées
    series = [
        {
            "name": names[i],
            "volatility": float(volatilities[i]),
            "values": prices[i].tolist(),
        }
        for i in stock_indices
    ]
    
    # Calculer max_y basé sur les données filtrées
    filtered_prices = prices[stock_indices] if stock_indices else prices
    max_y = float(filtered_prices.max() * 1.2) if len(filtered_prices) > 0 else 1000.0
    
    payload = {
        "timestamps": timeline.tolist(),
        "series": series,
        "max_y": max_y,
    }
    
    return jsonify(payload)


# ---- 8) Lancer le serveur ----
if __name__ == '__main__':
    app.run(debug=True)