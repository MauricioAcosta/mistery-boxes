from ..extensions import db
from ..models.wallet import Wallet, Transaction


class WalletService:

    @staticmethod
    def get_wallet(user_id: int) -> Wallet:
        return Wallet.query.filter_by(user_id=user_id).first()

    @staticmethod
    def deposit(user_id: int, amount: float, description: str = 'Deposit') -> Wallet:
        wallet = WalletService._get_or_raise(user_id)
        wallet.balance = float(wallet.balance) + amount
        db.session.add(Transaction(
            wallet_id=wallet.id, type='deposit',
            amount=amount, balance_after=wallet.balance,
            description=description,
        ))
        db.session.flush()
        return wallet

    @staticmethod
    def debit(user_id: int, amount: float, description: str = '',
              reference_type: str = None, reference_id: int = None) -> Wallet:
        wallet = WalletService._get_or_raise(user_id)
        if float(wallet.balance) < amount:
            raise ValueError('Saldo insuficiente')
        wallet.balance = float(wallet.balance) - amount
        db.session.add(Transaction(
            wallet_id=wallet.id, type=reference_type or 'debit',
            amount=-amount, balance_after=wallet.balance,
            description=description, reference_id=reference_id,
        ))
        db.session.flush()
        return wallet

    @staticmethod
    def credit(user_id: int, amount: float, description: str = '',
               reference_type: str = None, reference_id: int = None) -> Wallet:
        wallet = WalletService._get_or_raise(user_id)
        wallet.balance = float(wallet.balance) + amount
        db.session.add(Transaction(
            wallet_id=wallet.id, type=reference_type or 'credit',
            amount=amount, balance_after=wallet.balance,
            description=description, reference_id=reference_id,
        ))
        db.session.flush()
        return wallet

    # ── Coins ──────────────────────────────────────────────────────────────

    COINS_PER_USD = 100   # 1 USD = 100 coins

    @staticmethod
    def buy_coins(user_id: int, usd_amount: float) -> dict:
        """Deduct USD and credit coins. Returns updated wallet."""
        wallet = WalletService._get_or_raise(user_id)
        if float(wallet.balance) < usd_amount:
            raise ValueError('Saldo insuficiente')
        coins_to_add = int(usd_amount * WalletService.COINS_PER_USD)
        wallet.balance = float(wallet.balance) - usd_amount
        wallet.coins = (wallet.coins or 0) + coins_to_add
        db.session.add(Transaction(
            wallet_id=wallet.id, type='coins_purchase',
            amount=-usd_amount, balance_after=wallet.balance,
            description=f'Compra {coins_to_add} coins',
        ))
        db.session.flush()
        return wallet

    @staticmethod
    def debit_coins(user_id: int, coins: int, description: str = '', reference_id: int = None) -> Wallet:
        wallet = WalletService._get_or_raise(user_id)
        if (wallet.coins or 0) < coins:
            raise ValueError('Monedas insuficientes')
        wallet.coins = (wallet.coins or 0) - coins
        db.session.flush()
        return wallet

    @staticmethod
    def _get_or_raise(user_id: int) -> Wallet:
        wallet = Wallet.query.filter_by(user_id=user_id).first()
        if not wallet:
            raise ValueError(f'Billetera no encontrada para el usuario {user_id}')
        return wallet
