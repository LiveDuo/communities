
const idlLedgerFactory = ({ IDL }) => {
	const SendArgs = IDL.Record({
		'to': IDL.Text,
		'fee': IDL.Record({ 'e8s': IDL.Nat64 }),
		'memo': IDL.Nat64,
		'from_subaccount': IDL.Opt(IDL.Vec(IDL.Nat8)),
		'created_at_time': IDL.Opt(IDL.Record({ 'timestamp_nanos': IDL.Nat64 })),
		'amount': IDL.Record({ 'e8s': IDL.Nat64 }),
	})
	const BalanceArgs = IDL.Record({ 'account': IDL.Text })
	return IDL.Service({
		'account_balance_dfx': IDL.Func([BalanceArgs], [IDL.Record({ 'e8s': IDL.Nat64 })], ['query']),
		'account_balance': IDL.Func([IDL.Vec(IDL.Nat8)], [IDL.Record({ 'e8s': IDL.Nat64 })], ['query']),
		'send_dfx': IDL.Func([SendArgs], [IDL.Nat64], []),
	})
}
export { idlLedgerFactory }

export const ledgerCanisterId = process.env.REACT_APP_LEDGER_CANISTER_ID

const createLedgerActorPlug = async () => {
	const actor = await window.ic?.plug.createActor({ canisterId: ledgerCanisterId, interfaceFactory: idlLedgerFactory })
	return actor
}
export { createLedgerActorPlug }
