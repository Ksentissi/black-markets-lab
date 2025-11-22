import dash
from layout import serve_layout
from callback import register_callbacks

# --- Créer l'application ---
app = dash.Dash(__name__)

# --- Charger le layout ---
app.layout = serve_layout()

# --- Enregistrer les callbacks ---
register_callbacks(app)

# --- Lancer le serveur ---
if __name__ == '__main__':
    app.run(debug=True)
