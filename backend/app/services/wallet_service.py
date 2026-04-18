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
            raise ValueError('Insufficient balance')
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

    @staticmethod
    def _get_or_raise(user_id: int) -> Wallet:
        wallet = Wallet.query.filter_by(user_id=user_id).first()
        if not wallet:
            raise ValueError(f'Wallet not found for user {user_id}')
        return wallet
