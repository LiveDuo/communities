import { icHost } from '../agents'

import { isLocalhost } from './index'

const getPrincipalUrl = (childPrincipal) => {
	if (isLocalhost(icHost))
		return `http://${childPrincipal}.${icHost.replace('127.0.0.1', 'localhost')}/`
	else
		return `https://${childPrincipal}.${icHost}/`
}
export { getPrincipalUrl }
