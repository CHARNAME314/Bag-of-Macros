import {
	setActiveEffects,
	setAuraEffectUpdatesWhenDeleted,
	setAuraEffectsWhenEntered,
	setAuraEffectUpdatesWhenMoved,
	setAuraEffectsWhenLeft,
	updateAuraEffectsOnUse,
	updateAuraFlags,
	updateAuraWhenMoved
} from "../../../helper-functions.js"
import {insectCloud as s} from "../../../strings/features.js"

const checkAttackerVision = (workflow) => {
	if (workflow.targets.first() == workflow.attackingToken) return false
	const [target, bsRange, tsRange, units] = getCheckAttackerVisionParams(workflow)
	if (!["ft", "m", null].includes(units) && (bsRange > 0 || tsRange > 0)) return false 
	const attackerIsDefenderEffectOrigin = checkEffectOrigin(target, workflow.attackingToken)
	if (attackerIsDefenderEffectOrigin) return false
	const inBsOrTsRange = getIfInBsOrTsRange(bsRange, tsRange, target, workflow)
	const defenderIsOwnEffectOrigin = checkEffectOrigin(target, target)
	if (!inBsOrTsRange && defenderIsOwnEffectOrigin) return true
	const attackerIsOwnEffectOrigin = checkEffectOrigin(workflow.attackingToken, workflow.attackingToken)
	if (!inBsOrTsRange && !attackerIsOwnEffectOrigin) return true
	return false
}
const checkDefenderVision = (workflow) => {
	if (workflow.targets.first() == workflow.attackingToken) return false
	const [target, bsRange, tsRange, units] = getCheckDefenderVisionParams(workflow)
	if (!["ft", "m", null].includes(units) && (bsRange > 0 || tsRange > 0)) return false
	const defenderIsAttackerEffectOrigin = checkEffectOrigin(workflow.attackingToken, target)
	if (defenderIsAttackerEffectOrigin) return false
	const inBsOrTsRange = getIfInBsOrTsRange(bsRange, tsRange, target, workflow)
	const defenderIsOwnEffectOrigin = checkEffectOrigin(target, target)
	if (inBsOrTsRange || defenderIsOwnEffectOrigin) return false
	return true
}
const checkEffectOrigin = (effectedToken, candidateToken) => {
	const effect = effectedToken.actor.effects.find(effect => 
		s.insectCloudEffectNames.includes(effect.name)
	)
	const origin = effect?.origin ?? {}
	return origin == candidateToken.actor.uuid
}
const getCheckAttackerVisionParams = (workflow) => {
	const target = workflow.targets.first()
	const bsRange = workflow.actor.attributes.senses.blindsight
	const tsRange = workflow.actor.attributes.senses.tremorsense
	const units = workflow.actor.attributes.senses.units	
	return [target, bsRange, tsRange, units] 
}
const getCheckDefenderVisionParams = (workflow) => {
	const target = workflow.targets.first()
	const bsRange = target.actor.system.attributes.senses.blindsight
	const tsRange = target.actor.system.attributes.senses.tremorsense
	const units = target.actor.system.attributes.senses.units	
	return [target, bsRange, tsRange, units] 
}
const getEffectData = async (originUuid, templateUuid) => {
	const duration = await getEffectDuration(templateUuid)
	return {
		name: "Insect Cloud", 
		icon: "icons/creatures/invertebrates/wasp-swarm-movement.webp", 
		origin: originUuid,
		duration,
		changes: [{
				key: "flags.midi-qol.grants.disadvantage.attack.all", 
				mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM, 
				value: [`CHARNAME.macros.insectPlague.checkAttackerVision(workflow)`]
			},{
				key: "flags.midi-qol.advantage.attack.all", 
				mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM, 
				value: [`CHARNAME.macros.insectPlague.checkDefenderVision(workflow)`]
			},{
				key: "flags.midi-qol.grants.advantage.attack.all", 
				mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM, 
				value: [`CHARNAME.macros.insectPlague.checkDefenderVision(workflow)`]
			},{
				key: "flags.midi-qol.disadvantage.attack.all", 
				mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM, 
				value: [`CHARNAME.macros.insectPlague.checkAttackerVision(workflow)`]
		}],
		disabled: false
	}
}
const getEffectDuration = async (templateUuid) => {
	const template = await fromUuid(templateUuid)
	const sourceActor = await fromUuid(template.flags["midi-qol"].actorUuid)
	const templateEffect = sourceActor.effects.find(effect => effect.name == s.templateEffectName)
	return templateEffect.duration
}
const getIfInBsOrTsRange = (bsRange, tsRange, target, workflow) => {
	const maxBsOrTsRange = Math.max(bsRange, tsRange)
	return MidiQOL.findNearby("all", 
		target, 
		maxBsOrTsRange, 
		{canSee: true}
	).filter(token => 
		token.actor.uuid == workflow.attackingToken.actor.uuid
	).length > 0 	
}
const getTokenActorUuids = async (template, token) => {
	const tokenIds = game.modules.get("templatemacro").api.findContained(template)
	const elligibleTokens = tokenIds.map(id => 
		canvas.scene.collections.tokens.get(id)
	).filter(tokenDoc => token.document.uuid != tokenDoc.uuid)
	if (elligibleTokens.length < 1) return false
	return elligibleTokens.filter(tokenDoc => {
		const effects = tokenDoc.actor?.effects ?? []
		return effects.filter(effect => 
			effect.name != s.effectName
		).length > 0
	}).map(tokenDoc => tokenDoc.actor.uuid)	
}
const onUse = async ({actor, args, token}) => {
	const template = await setTemplateAttachment(args, token)
	const tokenActorUuids = await getTokenActorUuids(template, token)
	if (!tokenActorUuids) return false
	updateAuraEffectsOnUse(actor, 
		args, 
		s.templateEffectName, 
		getEffectData, 
		tokenActorUuids
	)
	updateAuraFlags(s.flagName, template, tokenActorUuids)
}
const setTemplateAttachment = async (args, token) => {
	const template = await fromUuid(args[0].templateUuid)
	await tokenAttacher.attachElementToToken(template, token, true)
	return template
}
const whenDeleted = async (template) => {
	setAuraEffectUpdatesWhenDeleted(
		s.effectName, 
		s.flagName, 
		template
	)
}
const whenEntered = async (template, token) => {
	setAuraEffectsWhenEntered(
		s.effectName, 
		s.flagName, 
		getEffectData, 
		template, 
		token
	)
}
const whenLeft = async (template, token) => {
	setAuraEffectsWhenLeft(
		s.effectName, 
		s.flagName, 
		template, 
		token
	)
}
const whenMoved = async (template) => {
	const dispositions = [-1, 0, 1]
	updateAuraWhenMoved(
		dispositions, 
		s.effectName, 
		s.flagName, 
		getEffectData, 
		template
	)
}

export const insectCloud = {
	checkAttackerVision,
	checkDefenderVision,
	onUse,
	whenDeleted,
	whenEntered,
	whenLeft,
	whenMoved	
}