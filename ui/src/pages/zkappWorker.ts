import { Mina, PublicKey, UInt64, fetchAccount } from 'o1js';

type Transaction = Awaited<ReturnType<typeof Mina.transaction>>;

// ---------------------------------------------------------------------------------------

import type { GameDeposit } from '../../../contracts/src/gamedeposit';

const state = {
  GameDeposit: null as null | typeof GameDeposit,
  zkapp: null as null | GameDeposit,
  transaction: null as null | Transaction,
};

// ---------------------------------------------------------------------------------------

const functions = {
  setActiveInstanceToBerkeley: async (args: {}) => {
    const Devnet = Mina.Network(
      'https://proxy.devnet.minaexplorer.com/graphql'
    );
    console.log('Devnet Instance Created');
    Mina.setActiveInstance(Devnet);
  },
  loadContract: async (args: {}) => {
    const { GameDeposit } = await import('../../../contracts/build/src/gamedeposit.js');
    state.GameDeposit = GameDeposit;
  },
  compileContract: async (args: {}) => {
    await state.GameDeposit!.compile();
  },
  fetchAccount: async (args: { publicKey58: string }) => {
    const publicKey = PublicKey.fromBase58(args.publicKey58);
    return await fetchAccount({ publicKey });
  },
  initZkappInstance: async (args: { publicKey58: string }) => {
    const publicKey = PublicKey.fromBase58(args.publicKey58);
    state.zkapp = new state.GameDeposit!(publicKey);
  },
  getOwner: async (args: {}) => {
    const currentNum = await state.zkapp!.Owner.get();
    return JSON.stringify(currentNum.toJSON());
  },
  createUpdateTransaction: async (args: { amount: UInt64 }) => {
    const transaction = await Mina.transaction(async () => {
      await state.zkapp!.deposit(args.amount);
    });
    state.transaction = transaction;
  },
  proveUpdateTransaction: async (args: {}) => {
    await state.transaction!.prove();
  },
  getTransactionJSON: async (args: {}) => {
    return state.transaction!.toJSON();
  },
};

// ---------------------------------------------------------------------------------------

export type WorkerFunctions = keyof typeof functions;

export type ZkappWorkerRequest = {
  id: number;
  fn: WorkerFunctions;
  args: any;
};

export type ZkappWorkerReponse = {
  id: number;
  data: any;
};

if (typeof window !== 'undefined') {
  addEventListener(
    'message',
    async (event: MessageEvent<ZkappWorkerRequest>) => {
      const returnData = await functions[event.data.fn](event.data.args);

      const message: ZkappWorkerReponse = {
        id: event.data.id,
        data: returnData,
      };
      postMessage(message);
    }
  );
}

console.log('Web Worker Successfully Initialized.');
