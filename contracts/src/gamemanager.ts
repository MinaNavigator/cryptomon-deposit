import {
  PublicKey,
  SmartContract,
  state,
  DeployArgs,
  State,
  UInt64,
  method,
  Permissions,
  AccountUpdate,
  Struct,
  Field,
  Poseidon,
  Provable,
} from 'o1js';

export class MoneyData extends Struct({
  id: UInt64,
  user: PublicKey,
  amount: UInt64,
}) {
  constructor(value: { id: UInt64, user: PublicKey; amount: UInt64 }) {
    super(value);
  }

  hash(): Field {
    return Poseidon.hash([
      new Field(this.id.value),
      this.user.x,
      this.user.isOdd.toField(),
      new Field(this.amount.value),
    ]);
  }
}


/**
 * Smartcontract to deposit money on cryptomon game
 */
export class GameManager extends SmartContract {
  @state(PublicKey) GameContract = State<PublicKey>();
  @state(PublicKey) Owner = State<PublicKey>();
  @state(UInt64) DepositId = State<UInt64>();
  @state(UInt64) WithdrawId = State<UInt64>();

  events = {
    deposit: MoneyData,
    withdraw: MoneyData,
  };

  init() {
    super.init();

    this.account.permissions.set({
      ...Permissions.default(),
      editState: Permissions.proofOrSignature(),
    });
  }

  /** Owner right to update owner or contract address receiver */
  @method async setOwner(newOwner: PublicKey) {
    // define owner of the contract to update info like owner and contract address
    const actualOwner = this.Owner.getAndRequireEquals();
    const contractOwner = Provable.if<PublicKey>(
      actualOwner.equals(PublicKey.empty()),
      newOwner,
      actualOwner
    );
    AccountUpdate.createSigned(contractOwner);

    this.Owner.set(newOwner);
  }


  /** Deposit mina to the contract, the event will be use to get amount deposited from the game */
  @method async deposit(amount: UInt64) {
    // can't deposit 0
    amount.greaterThan(UInt64.zero).assertTrue();

    let senderPublicKey = this.sender.getAndRequireSignature();
    const owner = this.Owner.getAndRequireEquals();
    // don't send if the owner is not defined
    owner.isEmpty().assertFalse();

    const actualId = this.DepositId.getAndRequireEquals();
    const newId = actualId.add(1);

    // emit a event to retrieve deposit
    const data = new MoneyData({ id: newId, user: senderPublicKey, amount });
    this.DepositId.set(newId);

    this.emitEvent('deposit', data);
  }



  /** Withdraw mina to an other account, usefull to pay user or game owner */
  @method async withdraw(amount: UInt64, receiver: PublicKey, id: UInt64) {
    // can't withdraw 0
    amount.greaterThan(UInt64.zero).assertTrue();

    // don't send is the withdrawAddress is not defined
    receiver.isEmpty().assertFalse();

    // don't withdraw if no owner defined
    const actualOwner = this.Owner.getAndRequireEquals();
    actualOwner.isEmpty().assertFalse();

    // sender need to be the owner
    let senderPublicKey = this.sender.getAndRequireSignature();
    actualOwner.assertEquals(senderPublicKey);

    this.send({ to: receiver, amount });

    const actualId = this.WithdrawId.getAndRequireEquals();
    const newId = actualId.add(1);
    newId.assertEquals(id);

    // emit a event to retrieve withdraw
    const data = new MoneyData({ id, user: receiver, amount });
    this.WithdrawId.set(id);

    this.emitEvent('withdraw', data);
  }
}
