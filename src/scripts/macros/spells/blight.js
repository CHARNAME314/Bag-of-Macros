const getBlightEffectData = async (origin) => {
	return {
		name: `Blight Saving Throw Disadvantage`, 
		icon: "icons/magic/movement/chevrons-down-yellow.webp", 
		origin: origin,
		changes: [{key: "flags.midi-qol.disadvantage.ability.save.all", mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM, value: ["1"], "priority": 20}],
		"flags.dae.stackable": "noneName",
		"flags.times-up.isPassive": true,
		"flags.dae.specialDuration": ["shortRest", "longRest", "combatEnd", "isSave"],
		"flags.dae.showIcon": false,
		disabled: false
	}
}
const setBlightHook = async (castLevel) => {
	const blightPreDamageRollHookId = Hooks.once("dnd5e.preRollDamage", (rolledItem, rollConfig) => {
		const maxDamageRoll = 8 * castLevel + 32
		const maxDamageString = String(maxDamageRoll) + "[necrotic]" 
		rollConfig.parts = [maxDamageString]
	})	
}
const setSpellEffects = async ({speaker, actor, token, character, item, args, scope, workflow}) => {
	if (args[0].hitTargets[0].actor.system.details.type.value == "plant") {
		const effectData = await getBlightEffectData(args[0].item.uuid)
		await MidiQOL.socket().executeAsGM("createEffects", { actorUuid: args[0].hitTargets[0].actor.uuid, effects: [effectData] })
		await setBlightHook(args[0].castData.castLevel)
	}	
}

export const blight = {
	"setSpellEffects": setSpellEffects
}