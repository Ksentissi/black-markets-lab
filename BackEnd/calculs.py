import numpy as np


def simulate_stock_prices(num_simulations, time, num_steps):
   """
   Simule num_simulations trajectoires de prix d'actions avec le modèle de Black-Scholes.
   Chaque action reçoit une volatilité fixe tirée d'une distribution gaussienne.
   """
  
   dt = time / num_steps
   prices = np.zeros((num_simulations, num_steps))
  
   # --- Paramètres de volatilité ---
   mu_vol = 0.80           # moyenne
   sigma_vol = 0.15        # écart-type
   sigma_min = 0.70        # borne basse
   sigma_max = 0.90        # borne haute


   r = 0.02  # taux sans risque


   # Stockage des volatilités fixes pour chaque action
   volatilities = np.zeros(num_simulations)


   # --- Boucle sur les simulations ---
   for i in range(num_simulations):


       # 1) Prix initial réaliste
       initial_price = np.random.uniform(75, 300)
       prices[i, 0] = initial_price


       # 2) Volatilité tirée une fois et FIXÉE
       vol = np.random.normal(mu_vol, sigma_vol)
       vol = np.clip(vol, sigma_min, sigma_max)
       volatilities[i] = vol


       # 3) Simulation GBM
       for t in range(1, num_steps):
           z = np.random.standard_normal()
           prices[i, t] = prices[i, t-1] * np.exp(
               (r - 0.5 * vol ** 2) * dt +
               vol * np.sqrt(dt) * z
           )
           #Hello im kamil from vscode
# Kamil is great 
# Kamil from VSCCode
   return prices, volatilities