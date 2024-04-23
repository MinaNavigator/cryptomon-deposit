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

export class DepositData extends Struct({
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
export class GameDeposit extends SmartContract {
  @state(PublicKey) GameContract = State<PublicKey>();
  @state(PublicKey) Owner = State<PublicKey>();
  @state(UInt64) CurrentId = State<UInt64>();

  events = {
    deposit: DepositData,
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

  /** Define the address who will receive the funds */
  @method async setContractAddress(contractAddress: PublicKey) {
    const actualOwner = this.Owner.getAndRequireEquals();
    // don't set is the owner is not defined
    actualOwner.isEmpty().assertFalse();
    AccountUpdate.createSigned(actualOwner);
    this.GameContract.set(contractAddress);
  }

  /** Deposit mina to the contract address, the event will be use to get amount deposited from the game */
  @method async deposit(amount: UInt64) {
    // can't deposit 0
    amount.greaterThan(UInt64.zero).assertTrue();

    let senderPublicKey = this.sender.getUnconstrained();
    let senderUpdate = AccountUpdate.createSigned(senderPublicKey);
    const contractAddress = this.GameContract.getAndRequireEquals();
    // don't send is the contract is not defined
    contractAddress.isEmpty().assertFalse();
    senderUpdate.send({ to: contractAddress, amount });

    const actualId = this.CurrentId.getAndRequireEquals();
    const newId = actualId.add(1);

    // emit a event to retrieve deposit
    const data = new DepositData({ id: newId, user: senderPublicKey, amount });
    this.CurrentId.set(newId);

    this.emitEvent('deposit', data);
  }
}
