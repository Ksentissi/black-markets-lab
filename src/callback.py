from dash import Output, Input
import plotly.graph_objs as go
import numpy as np

from calculs import simulate_stock_prices


# --- Paramètres globaux (garde-les synchronisés avec dash_app.py) ---
time = 2
this_num_simulations = 10
this_num_steps = 252

# Données simulées
simulated_prices = simulate_stock_prices(this_num_simulations, time, this_num_steps)

# Volatilités fixes
fixed_volatilities = np.clip(
    np.random.normal(0.25, 0.15, this_num_simulations),
    0.15, 0.50
)

names = ["Apple", "Microsoft", "Google", "Amazon", "Facebook",
         "Tesla", "Netflix", "NVIDIA", "Adobe", "Intel"]


# 🟦 CALLBACK 1 — START / STOP
def register_callbacks(app):

    @app.callback(
        Output('interval-component', 'disabled'),
        Output('simulation-state', 'data'),
        Input('start-button', 'n_clicks'),
        Input('stop-button', 'n_clicks'),
    )
    def control_simulation(start, stop):
        ctx = app.callback_context

        if not ctx.triggered:
            raise Exception("No trigger")

        triggered = ctx.triggered[0]['prop_id'].split('.')[0]

        if triggered == 'start-button':
            return False, 'running'   # Interval activé
        else:
            return True, 'stopped'    # Interval désactivé


    # 🟥 CALLBACK 2 — Animation progressive
    @app.callback(
        Output('stock-price-graph', 'figure'),
        Input('interval-component', 'n_intervals'),
        Input('simulation-state', 'data')
    )
    def update_graph(n_intervals, sim_state):

        # Si STOP → renvoyer la figure actuelle sans bouger
        if sim_state == 'stopped':
            return go.Figure()

        updated_trace = []
        step = min(n_intervals + 1, this_num_steps)

        for i in range(this_num_simulations):
            initial_price = simulated_prices[i, 0]
            volatility = fixed_volatilities[i]

            legend = f"{names[i]}<br>Prix Initial: {initial_price:.2f}<br>Volatilité: {volatility:.2f}"

            updated_trace.append(go.Scatter(
                x=np.linspace(0, time, this_num_steps),
                y=simulated_prices[i, :step],
                mode='lines',
                name=legend
            ))

        layout = go.Layout(
            title="Simulation des Prix d'Actions (Modèle Black-Scholes)",
            xaxis={'title': 'Temps (années)'},
            yaxis={'title': 'Prix de l\'Action'}
        )

        return go.Figure(data=updated_trace, layout=layout)
