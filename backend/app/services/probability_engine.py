class ProbabilityEngine:
    """
    Maps a provably-fair float in [0, 1) to a BoxItem using weighted probabilities.

    Example — items [A:50, B:30, C:20] with total weight 100:
        A covers [0.00, 0.50)
        B covers [0.50, 0.80)
        C covers [0.80, 1.00)

    A result_float of 0.65 therefore wins B.
    """

    @staticmethod
    def select_item(items: list, result_float: float):
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

        return items[-1]  # floating-point edge case guard

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
