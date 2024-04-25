import { Mina, PrivateKey, PublicKey, UInt64, fetchAccount } from 'o1js';

type Transaction = Awaited<ReturnType<typeof Mina.transaction>>;

// ---------------------------------------------------------------------------------------

import type { GameManager } from '../../../contracts/src/gamemanager';

const state = {
  GameManager: null as null | typeof GameManager,
  zkapp: null as null | GameManager,
  transaction: null as null | Transaction,
};

// ---------------------------------------------------------------------------------------

const functions: any = {
  setActiveInstanceToDevnet: async (args: {}) => {
    console.log("worker setActiveInstanceToDevnet");
    const Devnet = Mina.Network(
      'https://proxy.devnet.minaexplorer.com/graphql'
    );
    console.log('Devnet Instance Created');
    Mina.setActiveInstance(Devnet);
  },
  loadContract: async (args: {}) => {
    const { GameManager } = await import('../../../contracts/build/src/gamemanager.js');
    state.GameManager = GameManager as unknown as any;
  },
  compileContract: async (args: {}) => {
    await state.GameManager!.compile();
  },
  fetchAccount: async (args: { publicKey58: string }) => {
    const publicKey = PublicKey.fromBase58(args.publicKey58);
    return await fetchAccount({ publicKey });
  },
  initZkappInstance: async (args: { publicKey58: string }) => {
    const publicKey = PublicKey.fromBase58(args.publicKey58);
    state.zkapp = new state.GameManager!(publicKey);
  },
  getOwner: async (args: {}) => {
    console.log("getOwner worker");
    const currentOwner = await state.zkapp!.Owner.get();
    console.log("currentOwner", currentOwner.toBase58());
    return JSON.stringify(currentOwner!.toJSON());
  },
  createUpdateTransaction: async (args: { amountJson: string, sender: string }) => {
    const amount64 = UInt64.fromJSON(args.amountJson);
    console.log("amount", amount64);
    const transaction = await Mina.transaction({ sender: PublicKey.fromJSON(args.sender) }, async () => {
      await state.zkapp!.deposit(amount64);
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
      console.log("message received", event.data);
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
