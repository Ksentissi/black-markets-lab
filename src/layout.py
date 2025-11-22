from dash import html, dcc

def serve_layout():
    return html.Div([

        html.H1("Simulation du Modèle Black-Scholes", style={'text-align': 'center'}),

        # Boutons Start / Stop
        html.Div([
            html.Button("Start Simulation", id='start-button', n_clicks=0),
            html.Button("Stop Simulation", id='stop-button', n_clicks=0),
        ], style={'textAlign': 'center', 'marginBottom': '20px'}),

        # Mémoire de l'état (running / stopped)
        dcc.Store(id='simulation-state', data='stopped'),

        # Le graphique (SANS figure ici !)
        dcc.Graph(id='stock-price-graph'),

        # Interval pour l’animation
        dcc.Interval(
            id='interval-component',
            interval=100,
            n_intervals=0,
            disabled=True
        )
    ])
