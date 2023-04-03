import { icHost, isLocal } from '../agents'

const getPrincipalUrl = (childPrincipal) => {
	if (isLocal)
		return `http://${childPrincipal}.${icHost.replace('127.0.0.1', 'localhost')}/`
	else
		return `https://${childPrincipal}.${icHost}/`
}
export { getPrincipalUrl }
