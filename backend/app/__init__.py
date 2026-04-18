from flask import Flask
from .config import config_map
from .extensions import db, jwt, cors, migrate


def create_app(config_name='development'):
    app = Flask(__name__)
    app.config.from_object(config_map[config_name])

    db.init_app(app)
    jwt.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": "*"}})
    migrate.init_app(app, db)

    from .routes import auth, boxes, wallet, exchange, verify, admin
    app.register_blueprint(auth.bp)
    app.register_blueprint(boxes.bp)
    app.register_blueprint(wallet.bp)
    app.register_blueprint(exchange.bp)
    app.register_blueprint(verify.bp)
    app.register_blueprint(admin.bp)

    return app
