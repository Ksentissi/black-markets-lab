"""
Tests for the /api/simulate REST endpoint.

Covers the request-parsing branches in app.api_simulate:
  - GET with no body -> default stock universe
  - POST with string stock names -> filtered against AVAILABLE_STOCKS
  - POST with dict stock configs -> explicit initial_price / volatility honored
  - response always carries an insightSchedule alongside the raw series
"""

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import pytest
from app import app as flask_app
from config import AVAILABLE_STOCKS


@pytest.fixture
def client():
    flask_app.config["TESTING"] = True
    with flask_app.test_client() as c:
        yield c


class TestSimulateEndpoint:

    def test_get_returns_default_stocks(self, client):
        resp = client.get("/api/simulate")
        assert resp.status_code == 200
        data = resp.get_json()
        assert len(data["series"]) == 5
        assert [s["name"] for s in data["series"]] == AVAILABLE_STOCKS[:5]
        assert len(data["timestamps"]) == 252

    def test_post_empty_body_falls_back_to_default(self, client):
        resp = client.post("/api/simulate", json={})
        assert resp.status_code == 200
        data = resp.get_json()
        assert len(data["series"]) == 5

    def test_post_with_named_stocks(self, client):
        resp = client.post("/api/simulate", json={"stocks": ["Apple", "Tesla"], "num_steps": 30})
        assert resp.status_code == 200
        data = resp.get_json()
        names = [s["name"] for s in data["series"]]
        assert names == ["Apple", "Tesla"]
        assert len(data["timestamps"]) == 30
        for s in data["series"]:
            assert len(s["values"]) == 30

    def test_post_filters_unknown_stock_names(self, client):
        resp = client.post("/api/simulate", json={"stocks": ["Apple", "NotARealStock"], "num_steps": 10})
        data = resp.get_json()
        names = [s["name"] for s in data["series"]]
        assert names == ["Apple"]

    def test_post_with_dict_configs_respects_initial_price_and_volatility(self, client):
        resp = client.post("/api/simulate", json={
            "stocks": [{"name": "Custom", "initial_price": 42.0, "volatility": 0.25}],
            "num_steps": 10,
        })
        data = resp.get_json()
        series = data["series"][0]
        assert series["name"] == "Custom"
        assert series["values"][0] == pytest.approx(42.0)
        assert series["volatility"] == pytest.approx(0.25)

    def test_response_includes_insight_schedule(self, client):
        resp = client.post("/api/simulate", json={"stocks": ["Apple", "Microsoft"], "num_steps": 2000})
        data = resp.get_json()
        assert "insightSchedule" in data
        assert isinstance(data["insightSchedule"], list)

    def test_response_includes_metadata_and_max_y(self, client):
        resp = client.post("/api/simulate", json={"stocks": ["Apple"], "num_steps": 10})
        data = resp.get_json()
        series = data["series"][0]
        assert "metadata" in series
        assert "max_y" in data
        assert data["max_y"] > 0
