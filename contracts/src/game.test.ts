import { GameDeposit, DepositData } from './gamedeposit.js';
import { GameContract, WithdrawData } from './gamecontract.js';
import { Field, Mina, PrivateKey, PublicKey, AccountUpdate, UInt64, Account, assert } from 'o1js';

/*
 * This file specifies how to test the `Add` example smart contract. It is safe to delete this file and replace
 * with your own tests.
 *
 * See https://docs.minaprotocol.com/zkapps for more info.
 */

let proofsEnabled = false;

describe('Game', () => {
  let deployerAccount: PublicKey,
    deployerKey: PrivateKey,
    senderAccount: PublicKey,
    senderKey: PrivateKey,
    zkAppGameContractAddress: PublicKey,
    zkAppGameContractPrivateKey: PrivateKey,
    zkAppGameContract: GameContract,
    zkAppGameDepostiAddress: PublicKey,
    zkAppGameDepositPrivateKey: PrivateKey,
    zkAppGameDeposit: GameDeposit;

  beforeAll(async () => {
    if (proofsEnabled) {
      await GameContract.compile();
      await GameDeposit.compile();
    }
  });

  beforeEach(() => {
    const Local = Mina.LocalBlockchain({ proofsEnabled });
    Mina.setActiveInstance(Local);
    ({ privateKey: deployerKey, publicKey: deployerAccount } =
      Local.testAccounts[0]);
    ({ privateKey: senderKey, publicKey: senderAccount } =
      Local.testAccounts[1]);
    zkAppGameContractPrivateKey = PrivateKey.random();
    zkAppGameContractAddress = zkAppGameContractPrivateKey.toPublicKey();
    zkAppGameContract = new GameContract(zkAppGameContractAddress);
    zkAppGameDepositPrivateKey = PrivateKey.random();
    zkAppGameDepostiAddress = zkAppGameDepositPrivateKey.toPublicKey();
    zkAppGameDeposit = new GameDeposit(zkAppGameDepostiAddress);
  });

  async function localDeploy() {
    const txn = await Mina.transaction(deployerAccount, async () => {
      AccountUpdate.fundNewAccount(deployerAccount, 2);
      await zkAppGameContract.deploy();
      await zkAppGameDeposit.deploy();
    });
    await txn.prove();
    // this tx needs .sign(), because `deploy()` adds an account update that requires signature authorization
    await txn.sign([deployerKey, zkAppGameContractPrivateKey, zkAppGameDepositPrivateKey]).send();
  }

  it('generates and deploys the smarts contract', async () => {
    await localDeploy();
    const num = zkAppGameContract.CurrentId.get();
    const zero = new UInt64(0);
    expect(num).toEqual(zero);
    const num2 = zkAppGameDeposit.CurrentId.get();
    expect(num2).toEqual(zero);
  });

  it('define owner game contract', async () => {
    await localDeploy();

    const oldOwner = zkAppGameContract.Owner.get();
    expect(oldOwner).toEqual(PublicKey.empty());
    await setGameContractOwner();

    const newOwner = zkAppGameContract.Owner.getAndRequireEquals();
    expect(newOwner).toEqual(deployerAccount);
  });

  it('define owner game deposit', async () => {
    await localDeploy();

    const oldOwner = zkAppGameDeposit.Owner.get();
    expect(oldOwner).toEqual(PublicKey.empty());
    await setGameDepositOwner();

    const newOwner = zkAppGameDeposit.Owner.getAndRequireEquals();
    expect(newOwner).toEqual(deployerAccount);
  });

  it('define game contract for game deposit', async () => {
    await localDeploy();

    const gameContract = zkAppGameDeposit.GameContract.get();
    expect(gameContract).toEqual(PublicKey.empty());

    await setGameDepositOwner();
    await setContractAddress();

    const newGameContract = zkAppGameDeposit.GameContract.getAndRequireEquals();
    expect(newGameContract).toEqual(zkAppGameContractAddress);
  });

  it('make a deposit', async () => {
    await localDeploy();

    await setGameDepositOwner();
    await setContractAddress();

    const mina = new UInt64(10 ** 9);
    await deposit(mina);

    const bal = zkAppGameContract.account.balance.get();
    expect(bal).toEqual(mina);
  });

  it('make a withdraw', async () => {
    await localDeploy();

    await setGameDepositOwner();
    await setGameContractOwner();
    await setContractAddress();

    const mina = new UInt64(10 ** 9);
    await deposit(mina);

    const balanceBefore = Account(senderAccount).balance.get();
    const txn4 = await Mina.transaction(deployerAccount, async () => {
      zkAppGameContract.withdraw(mina, senderAccount, new UInt64(1));
      zkAppGameContract.requireSignature();
    });
    await txn4.prove();
    await txn4.sign([deployerKey, senderKey, zkAppGameContractPrivateKey]).send();
    const balanceAfter = Account(senderAccount).balance.get();

    // check if sender account receive 1 mina after withdraw
    const bal = balanceAfter.sub(balanceBefore);
    expect(bal).toEqual(mina);
  });

  it('make two deposit', async () => {
    await localDeploy();

    await setGameDepositOwner();

    await setContractAddress();

    const mina = new UInt64(10 ** 9);
    await deposit(mina);
    await deposit(mina.mul(5));

    const bal = zkAppGameContract.account.balance.get();
    expect(bal).toEqual(mina.mul(6));
    // check if the id correctly increment
    const currentId = zkAppGameDeposit.CurrentId.get()
    expect(currentId).toEqual(new UInt64(2));
  });

  async function setGameDepositOwner() {
    const txn = await Mina.transaction(deployerAccount, async () => {
      zkAppGameDeposit.setOwner(deployerAccount);
      zkAppGameDeposit.requireSignature();
    });
    await txn.prove();
    await txn.sign([deployerKey, zkAppGameDepositPrivateKey]).send();
  }

  async function setGameContractOwner() {
    const txn = await Mina.transaction(deployerAccount, async () => {
      zkAppGameContract.setOwner(deployerAccount);
      zkAppGameContract.requireSignature();
    });
    await txn.prove();
    await txn.sign([deployerKey, zkAppGameContractPrivateKey]).send();
  }

  async function setContractAddress() {
    const txn2 = await Mina.transaction(deployerAccount, async () => {
      zkAppGameDeposit.setContractAddress(zkAppGameContractAddress);
      zkAppGameDeposit.requireSignature();
    });
    await txn2.prove();
    await txn2.sign([deployerKey, zkAppGameDepositPrivateKey]).send();
  }

  async function deposit(amount: UInt64) {
    const txn3 = await Mina.transaction(deployerAccount, async () => {
      zkAppGameDeposit.deposit(amount);
      zkAppGameDeposit.requireSignature();
    });
    await txn3.prove();
    await txn3.sign([deployerKey, zkAppGameDepositPrivateKey]).send();
  }
});
