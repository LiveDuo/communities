/* global BigInt */

const BIG_PRECISION = 3 // to multiply a bigint with floats

const getBigIntAllowance = (number, zeros, allowance) => {
	const billion_cycles_with_allowance = BigInt(10 ** zeros) * BigInt(Math.floor((1 + allowance) * (10 ** BIG_PRECISION))) / BigInt(10 ** BIG_PRECISION)
	return BigInt(number) * billion_cycles_with_allowance
}
export { getBigIntAllowance }

const ONE_MYRIAD = 10n ** 4n
export { ONE_MYRIAD }

const ONE_TRILLION = 10n ** 15n
export { ONE_TRILLION }

const ICP_MICP = 10n ** 8n
export { ICP_MICP }
