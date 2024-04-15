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

export class WithdrawData extends Struct({
  id: UInt64,
  receiver: PublicKey,
  amount: UInt64,
}) {
  constructor(value: { id: UInt64, receiver: PublicKey; amount: UInt64 }) {
    super(value);
  }

  hash(): Field {
    return Poseidon.hash([
      new Field(this.id.value),
      this.receiver.x,
      this.receiver.isOdd.toField(),
      new Field(this.amount.value),
    ]);
  }
}

/**
 * Smartcontract to deposit money on cryptomon game
 */
export class GameContract extends SmartContract {
  @state(PublicKey) Owner = State<PublicKey>();
  @state(UInt64) CurrentId = State<UInt64>();

  events = {
    withdraw: WithdrawData,
  };

  init() {
    super.init();

    this.account.permissions.set({
      ...Permissions.default(),
      editState: Permissions.signature(),
      send: Permissions.signature()
    });
  }

  /** Owner right to update owner or withdraw */
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


  /** Deposit mina to the contract address, the event will be use to get amount deposited from the game */
  @method async withdraw(amount: UInt64, receiver: PublicKey) {
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

    const actualId = this.CurrentId.getAndRequireEquals();
    const newId = actualId.add(1);

    // emit a event to retrieve withdraw
    const data = new WithdrawData({ id: newId, receiver, amount });
    this.CurrentId.set(newId);

    this.emitEvent('withdraw', data);
  }
}
