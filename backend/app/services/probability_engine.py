"""
ProbabilityEngine
=================
Maps a provably-fair float in [0, 1) to a BoxItem using weighted probabilities.

Example — items [A:50, B:30, C:20] with total weight 100:
    A covers [0.00, 0.50)
    B covers [0.50, 0.80)
    C covers [0.80, 1.00)

A result_float of 0.65 therefore wins B.

House-edge enforcement
----------------------
When `box_price` and `target_rtp` are provided, the engine blends the
admin-configured weights with an RTP-corrected weight set so the long-run
expected payout converges to:

    EV = box_price × target_rtp   (e.g. $10 box × 0.70 = $7.00 EV)

The blending strength is controlled by `margin_strength` (0–1):
    0 → pure original weights (no adjustment)
    1 → full enforcement of target_rtp
"""


class ProbabilityEngine:

    # ── Basic selection (original weights) ────────────────────────────────

    @staticmethod
    def select_item(items: list, result_float: float):
        """Select an item using the admin-configured weights without adjustment."""
        if not items:
            return None

        total_weight = sum(item.weight for item in items)
        if total_weight == 0:
            return items[0]

        cumulative = 0.0
        for item in items:
            cumulative += item.weight / total_weight
            if result_float < cumulative:
                return item

        return items[-1]   # floating-point edge case guard

    # ── House-edge enforced selection ─────────────────────────────────────

    @staticmethod
    def select_item_with_margin(
        items: list,
        result_float: float,
        box_price: float,
        house_edge_pct: float = 30.0,
        margin_strength: float = 1.0,
    ):
        """
        Select an item while enforcing the configured house-edge.

        Algorithm
        ---------
        1. Compute current EV from admin weights.
        2. Compute target EV = box_price × (1 − house_edge_pct / 100).
        3. Find a scaling exponent k (via bisection) such that blended
           weights give exactly target EV.
        4. Lerp between original and adjusted weights by `margin_strength`.
        5. Use the blended weights for the final selection.

        If the box is already correctly calibrated (|current_ev − target_ev| < $0.01)
        or `margin_strength` == 0, fall back to plain selection.
        """
        if not items:
            return None

        if margin_strength <= 0:
            return ProbabilityEngine.select_item(items, result_float)

        orig_weights = [float(item.weight) for item in items]
        values       = [float(item.product.retail_value) for item in items]
        total_orig   = sum(orig_weights)

        if total_orig == 0:
            return items[0]

        probs_orig = [w / total_orig for w in orig_weights]
        current_ev = sum(v * p for v, p in zip(values, probs_orig))
        target_rtp = 1.0 - house_edge_pct / 100.0
        target_ev  = float(box_price) * target_rtp

        # Nothing to adjust
        if abs(current_ev - target_ev) < 0.01 or current_ev <= 0:
            return ProbabilityEngine.select_item(items, result_float)

        # ── Find exponent k via bisection ──────────────────────────────
        # Adjusted weight: w_i × k^(v_i / max_v)
        # k < 1 → high-value items become less likely (raise house edge)
        # k > 1 → high-value items become more likely (lower house edge)
        max_v = max(values) if any(v > 0 for v in values) else 1.0

        def ev_for_k(k):
            adj   = [w * (k ** (v / max_v)) for v, w in zip(values, orig_weights)]
            total = sum(adj)
            if total == 0:
                return 0.0
            return sum(v * a / total for v, a in zip(values, adj))

        lo, hi = (0.001, 1.0) if current_ev > target_ev else (1.0, 1000.0)
        for _ in range(60):           # 60 iterations → precision ~1e-18
            mid = (lo + hi) / 2
            if ev_for_k(mid) > target_ev:
                hi = mid
            else:
                lo = mid

        k = (lo + hi) / 2
        adj_weights = [w * (k ** (v / max_v)) for v, w in zip(values, orig_weights)]

        # ── Blend with margin_strength ─────────────────────────────────
        blended = [
            (1.0 - margin_strength) * ow + margin_strength * aw
            for ow, aw in zip(orig_weights, adj_weights)
        ]

        # ── Select using blended weights ───────────────────────────────
        total_blended = sum(blended)
        if total_blended == 0:
            return items[0]

        cumulative = 0.0
        for item, bw in zip(items, blended):
            cumulative += bw / total_blended
            if result_float < cumulative:
                return item

        return items[-1]

    # ── Diagnostic helpers ────────────────────────────────────────────────

    @staticmethod
    def item_probabilities(items: list) -> list:
        """Return each item augmented with its exact probability percentage."""
        total_weight = sum(i.weight for i in items)
        if total_weight == 0:
            return []
        return [
            {**i.to_dict(total_weight), 'probability_pct': round(i.weight / total_weight * 100, 4)}
            for i in items
        ]

    @staticmethod
    def box_ev(items: list) -> float:
        """Expected value of a box given its current item weights."""
        total = sum(i.weight for i in items)
        if total == 0:
            return 0.0
        return sum(float(i.product.retail_value) * i.weight / total for i in items)

    @staticmethod
    def box_rtp(items: list, box_price: float) -> float:
        """Return-to-player ratio (EV / price).  1.0 = break-even for players."""
        if box_price <= 0:
            return 0.0
        return ProbabilityEngine.box_ev(items) / box_price
