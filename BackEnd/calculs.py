import numpy as np

def simulate_stock_prices(num_simulations, time, num_steps, stock_configs=None):
    """
    Simule des trajectoires de prix d'actions avec le modèle de Black-Scholes.
    """
   
    dt = time / num_steps
    
    # Si des configurations spécifiques sont fournies, on utilise leur nombre
    if stock_configs:
        real_num_simulations = len(stock_configs)
    else:
        real_num_simulations = num_simulations

    prices = np.zeros((real_num_simulations, num_steps))
   
    # --- Paramètres de volatilité par défaut (Ajustés pour être plus réalistes/lents) ---
    mu_vol = 0.50           # moyenne (réduite de 0.80 à 0.50)
    sigma_vol = 0.10        # écart-type (réduit de 0.15 à 0.10)
    sigma_min = 0.20        # borne basse (réduite de 0.70 à 0.20)
    sigma_max = 0.60        # borne haute (réduite de 0.90 à 0.60)

    r = 0.02  # taux sans risque

    # Stockage des volatilités fixes pour chaque action
    volatilities = np.zeros(real_num_simulations)

    # --- Boucle sur les simulations ---
    for i in range(real_num_simulations):
        # Déterminer les paramètres pour cette simulation spécifique
        if stock_configs and i < len(stock_configs):
            config = stock_configs[i]
            initial_price = config.get('initial_price', np.random.uniform(75, 300))
            # Utiliser la volatilité fournie ou générer une aléatoire si non fournie
            if 'volatility' in config and config['volatility'] is not None:
                vol = float(config['volatility'])
            else:
                vol = np.random.normal(mu_vol, sigma_vol)
                vol = np.clip(vol, sigma_min, sigma_max)
        else:
            # Comportement par défaut aléatoire
            initial_price = np.random.uniform(75, 300)
            vol = np.random.normal(mu_vol, sigma_vol)
            vol = np.clip(vol, sigma_min, sigma_max)

        prices[i, 0] = initial_price
        volatilities[i] = vol

        # 3) Simulation GBM
        for t in range(1, num_steps):
            z = np.random.standard_normal()
            prices[i, t] = prices[i, t-1] * np.exp(
                (r - 0.5 * vol ** 2) * dt +
                vol * np.sqrt(dt) * z
            )

    return prices, volatilities
