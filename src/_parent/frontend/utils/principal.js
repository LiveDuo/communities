import { icHost } from '../agents'

const getPrincipalUrl = (childPrincipal) => {
	if (process.env.REACT_APP_ICP_ENV !== 'production')
		return `http://${icHost}/?canisterId=${childPrincipal}`
	else
		return `https://${childPrincipal}.${icHost}/`
}
export { getPrincipalUrl }
