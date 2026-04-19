from ..extensions import db
from datetime import datetime


class PlatformConfig(db.Model):
    """
    Key-value configuration store for platform-wide settings.

    Key             Type    Default    Description
    ─────────────── ─────── ────────── ──────────────────────────────────────
    house_edge_pct  float   30.0       Target platform margin as a percentage
                                       (e.g. 30 → keep 30 %, pay out 70 %)
    margin_strength float   1.0        How aggressively the engine enforces the
                                       margin (0 = off, 1 = full enforcement)
    """
    __tablename__ = 'platform_config'

    id         = db.Column(db.Integer, primary_key=True)
    key        = db.Column(db.String(64), unique=True, nullable=False, index=True)
    value      = db.Column(db.Text, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)

    # ── defaults ──────────────────────────────────────────────────────────
    DEFAULTS = {
        'house_edge_pct':  '30.0',   # 30 % platform margin
        'margin_strength': '1.0',    # full enforcement
    }

    # ── helpers ───────────────────────────────────────────────────────────
    @classmethod
    def get(cls, key: str, cast=float):
        row = cls.query.filter_by(key=key).first()
        raw = row.value if row else cls.DEFAULTS.get(key)
        if raw is None:
            return None
        try:
            return cast(raw)
        except (ValueError, TypeError):
            return raw

    @classmethod
    def set(cls, key: str, value, updated_by_id=None):
        row = cls.query.filter_by(key=key).first()
        if row:
            row.value      = str(value)
            row.updated_at = datetime.utcnow()
            row.updated_by = updated_by_id
        else:
            row = cls(key=key, value=str(value), updated_by=updated_by_id)
            db.session.add(row)
        db.session.commit()
        return row

    @classmethod
    def all_as_dict(cls):
        rows = {r.key: r.value for r in cls.query.all()}
        result = {}
        for k, default in cls.DEFAULTS.items():
            result[k] = float(rows.get(k, default))
        return result

    def to_dict(self):
        return {
            'key':        self.key,
            'value':      self.value,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
