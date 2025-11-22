import numpy as np

# Fonction pour simuler les prix d'une action avec le modèle de Black-Scholes
def simulate_stock_prices(num_simulations, time, num_steps):
    dt = 2*time / num_steps  # Pas de temps
    prices = np.zeros((num_simulations, num_steps))  # Matrice pour les prix simulés
    
    # Paramètres de volatilité
    mu_volatility = 0.4        # Moyenne de la distribution gaussienne
    sigma_volatility = 0.15     # Écart-type
    sigma_min = 0.3           # Borne basse réaliste
    sigma_max = 0.7           # Borne haute réaliste

    r = 0.02  # Taux d'intérêt sans risque

    # Initialiser les prix de départ et les volatilités pour chaque action
    for i in range(num_simulations):

        # --- 1) Prix initial ---
        initial_price = np.random.uniform(75, 300)
        prices[i, 0] = initial_price

        # --- 2) Volatilité UNIQUE tirée d'une gaussienne ---
        volatility = np.random.normal(mu_volatility, sigma_volatility)

        # bornes réalistes
        volatility = np.clip(volatility, sigma_min, sigma_max)

        # stocker pour accès externe (si besoin)
        simulate_stock_prices.volatility = volatility

        # --- 3) Simulation GBM ---
        for t in range(1, num_steps):
            z = np.random.standard_normal()   # bruit N(0,1)
            prices[i, t] = prices[i, t - 1] * np.exp(
                (r - 0.5 * volatility ** 2) * dt + 
                volatility * np.sqrt(dt) * z
            )

    return prices
