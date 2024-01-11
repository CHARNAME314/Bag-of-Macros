import {conditionLabels} from "../../constants.js"

const main = async ({item, workflow, args}) => {
	const hasCharm = item.effects.find(effect => effect.changes.find(change => conditionLabels["charmed"].includes(change.value.toLowerCase())))
	if (hasCharm) {
		workflow.saveDetails.advantage = true
	}
}

export const feyAncestry = {
	main
}