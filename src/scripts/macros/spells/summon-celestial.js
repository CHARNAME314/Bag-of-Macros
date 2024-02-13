import {getDialogueButtonType} from "../../helper-functions.js"
import {summonCelestial as s} from "../../strings/spells.js"
import {summoning} from "../../helpers/summons.js"

const getOverrides = async () => {
	return {
		general: {
			amountToSpawnByIndex: [10, 3, 5, 1]
		}
	}
}
const getSpellIconPaths = (choice) => {
	const index = s.choices.indexOf(choice)
	const actor = game.actors.find(actor => actor.name == s.spawnNames[index])
	const icon = actor?.img ?? false	
	if (!icon) return s.defaultIcons[index]
	return icon
}
const onUse = async ({actor, args, item, token, workflow}) => {
	const choice = await getDialogueButtonType(
		s.choices, 
		{width: s.choices.length * 150, height: "100%"}, 
		s.initHeader, 
		getSpellIconPaths, 
		60, 
		60, 
		[]
	)
	const overrides = await getOverrides(actor, workflow)
	summoning.createSpawn(actor, choice.value, item, overrides, s, token) 
}

export const summonCelestial = {
	onUse
}

const getButtonData = async() => {
	const img1 = await getSpawnIcon("Celestial Spirit Avenger")
	const img2 = await getSpawnIcon("Celestial Spirit Defender")
	return {
		buttons: [{
			label: `<br /><img align=middle src="${img1}" width="75" height="75" style="border:0px"><br />Celestial Spirit Avenger`,
			value: {
					token: { name:"Celestial Spirit Avenger"},
					actor: { name:"Celestial Spirit Avenger"},
					embedded: { Item: {}}
				}
		},{
			label: `<br /><img align=middle src="${img2}" width="75" height="75" style="border:0px"><br />Celestial Spirit Defender`,
			value: {
					token: { name:"Celestial Spirit Defender"},
					actor: { name:"Celestial Spirit Defender"},
					embedded: { Item: {}}
				}
		}], 
		title: 'Which celestial spirit?'
	}
}
const getInitImpactSequencerPath = async () => {
	if (actor.name == "Jakar" || actor.name == "Jakar (Test)") {
		return "jb2a.impact.011.dark_purple"
	} else {
		return "jb2a.impact.003.blue"
	}	
}
const getHookImpactSequencerPath = async () => {
	if (actor.name == "Jakar" || actor.name == "Jakar (Test)") {
		return "jb2a.impact.003.dark_purple"
	} else {
		return "jb2a.impact.004.blue"
	}	
}
const getItemUpdates = async (spawnName, originAttack, level) => {
	if (spawnName == "Celestial Spirit Avenger") {
		return {
			'Radiant Bow': {
				'data.damage.parts' : [[`2d6 + 2 + ${level}`, `radiant`]],
				'data.attackBonus' : `- @mod - @prof + ${originAttack}`
			}
		}
	} else {
		return {
			'Radiant Sword': {
				'data.damage.parts' : [[`1d10 + 3 + ${level}`, `radiant`]],
				'data.attackBonus' : `- @mod - @prof + ${originAttack}`
			}
		}
	}
}
const getSpawnBaseAc = async (spawnName) => {
	if (spawnName == "Celestial Spirit Avenger") {
		return baseAC = 11
	} else {
		return baseAC = 13
	}
}
const getSpawnDc = async (spawnName, originProf) => {
	if (spawnName == "Celestial Spirit Avenger") {
		return await getSpawnData('Actor.YBMH6vqEyEOOmaXh', originProf)
	} else {
		return await getSpawnData('Actor.jyXBptg69KwWqoej', originProf)
	}
}
const getSpawnData = async (spawnActorId, originProf) => {
	const spawnData = await fromUuid(spawnActorId)
	const spawnMod = spawnData.system.abilities.wis.mod 
	return originProf + spawnMod + 8
}
const getSpawnIcon = async(spawnName) => {
	//this is where we can change the logic to point to an exceptions file 
	if (spawnName == "Celestial Spirit Avenger" && (actor.name == "Jakar" || actor.name == "Jakar (Test)")) {
		return "images/Tokens/Creatures/Celestial/Solar_Large_Scale200_Celestial_A_11.webp"
	} else if (spawnName == "Celestial Spirit Defender" && (actor.name == "Jakar" || actor.name == "Jakar (Test)")) {
		return "images/Tokens/Creatures/Celestial/Planetar_Large_Scale150_Celestial_11.webp"
	} else if (spawnName == "Celestial Spirit Avenger" && (actor.name != "Jakar" || actor.name != "Jakar (Test)")) {
		return "images/Tokens/Creatures/Celestial/Solar_Large_Scale200_Celestial_A_01.webp"
	} else {
		return "images/Tokens/Creatures/Celestial/Planetar_Large_Scale150_Celestial_01.webp"
	}
}
const getSpawnUpdates = async (spawnName) => {
	//this is where our updates are going to live
	const originDc = actor.system.attributes.spelldc5
	const originAttack = originDc - 8
	const originLevel = actor.system.details.level ?? actor.system.details.cr
	const originProf = actor.system.attributes.prof
	const level = args[0].spellLevel	
	const spawnDc = await getSpawnDc(spawnName, originProf)
	
	return {
		token: {
			'displayName': CONST.TOKEN_DISPLAY_MODES.HOVER,
			'alpha': 0,
			'texture.src': await getSpawnIcon(spawnName)
		},
		actor: {
			'data.attributes.ac.flat' : await getSpawnBaseAc(spawnName) + level,
			'data.attributes.hp' : {value: 40+10*(level-5), max: 40+10*(level-5)},
			'data.details.cr' : originLevel,
			'data.bonuses.spell.dc': spawnDc
		},
		embedded: { 
			Item: await getItemUpdates(spawnName, originAttack, level)
		}		
	}
}