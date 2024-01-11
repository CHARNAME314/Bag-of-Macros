import {conditionLabels} from "../../constants.js"
import {getTokensInRange} from "../../helper-functions.js"

async function getEligibleTokenDocuments(tokenDocuments, scene, itemRange, originX, originY) {
	const tokenDocsInRange = await getTokensInRange(tokenDocuments, scene.grid.size, scene.grid.distance, itemRange, originX, originY)
	if (!tokenDocsInRange) return false
	const templateNonEffectedTokens = await getNonTemplateEffectedTokenDocs(tokenDocsInRange)
	if (!templateNonEffectedTokens) return false
	return templateNonEffectedTokens
}
async function getNonTemplateEffectedTokenDocs(tokenDocuments, itemEffectName) {
	return tokenDocuments.filter(token => {
		const effects = token.actor.statuses
		return effects.has(itemEffectName) == false
	})
}
const onUse = async ({args, workflow, item, actor, token}) => {
	const itemEffectName = "Convenient Effect: Aura of Purity"
	const template = await fromUuid(args[0].templateUuid)
	await tokenAttacher.attachElementToToken(template, token, true)
	const scene = await fromUuid(template.parent.uuid)
	const itemRange = args[0].item.system.target.value
	const tokenDocs = Array.from(scene.collections.tokens.values())
	
	const eligibleTokenDocs = await getEligibleTokenDocuments(tokenDocs, scene, itemRange, template.x, template.y)
	if (!eligibleTokenDocs) return false

	const tokenEffectUuids = await setTokenEffects(eligibleTokenDocs, token.document.disposition)
	await template.update({
		"flags.castData.auraOfPurity.tokensEffected": tokenEffectUuids
	})
}
const preTargetSave = async ({args, workflow, item, actor}) => {
	const itemHasEffect = item.effects.some(effect => effect.changes.some(change => {
		return conditionLabels["blinded"].includes(change.value.toLowerCase())
			|| conditionLabels["charmed"].includes(change.value.toLowerCase())
			|| conditionLabels["deafened"].includes(change.value.toLowerCase())
			|| conditionLabels["frightened"].includes(change.value.toLowerCase())
			|| conditionLabels["paralyzed"].includes(change.value.toLowerCase())
			|| conditionLabels["poisoned"].includes(change.value.toLowerCase())
			|| conditionLabels["stunned"].includes(change.value.toLowerCase())
	}))
	if (itemHasEffect) workflow.saveDetails.advantage = true
}
async function setTokenEffects(tokenDocs, casterDisposition) {
	let effected = []
	let uuid = ""
	for (let i=0; i < tokenDocs.length; i++) {
		console.log("tokenDocs[i]")
		console.log(tokenDocs[i])
		uuid = tokenDocs[i].actor.uuid
		if ((casterDisposition == 1 && tokenDocs[i].disposition != -1)
			|| (casterDisposition == -1  && tokenDocs[i].disposition != 1)) {
			game.dfreds.effectInterface.addEffect( {effectName: 'Aura of Purity', uuid} )
			effected.push(uuid)
		}
	}
	return effected
}

export const auraOfPurity = {
	preTargetSave,
	onUse
}