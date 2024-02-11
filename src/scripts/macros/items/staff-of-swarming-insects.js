import {
	deleteTempItem as deleteItem, 
	getDialogueButtonType, 
	getSourceMacroNames, 
	getUpdatedMacroNames, 
	setCastSpellUpdates,
} from "../../helper-functions.js"
import {staffOfSwarmingInsects as s} from "../../strings/items.js"

const castSpell = async (spell, staff, tokenActor, choice) => {
	const updates = await createCastWorkflow(spell, staff, tokenActor, choice)
	setCastSpellUpdates(updates, tokenActor)
}
const createCastWorkflow = async (spell, staff, tokenActor, choice) => {
	const [tempItem] = await createTempItem(spell, staff, tokenActor, choice)
	const workflow = await MidiQOL.completeItemUse(tempItem, spell)	
	return [tempItem, workflow]
}
const createTempItem = async (spell, staff, tokenActor, choice) => {
	const sourceMacroNames = await getSourceMacroNames(spell)
	const updatedMacroNames = await getUpdatedMacroNames(sourceMacroNames, "staffOfSwarmingInsects", spell.activation)
	const itemData = await getTempSpellItem(spell, staff, updatedMacroNames, choice)
	return await tokenActor.createEmbeddedDocuments("Item", [itemData])
}
const deleteTempItem = async (data) => {
	deleteItem(data)
}
const getChosenItem = async (choice, spells) => {
	if (choice == s.allChoices[3] || choice == s.allChoices[4]) {
		return game.items.find(item => item.name == s.damageWeaponName)
	} else {
		return spells.find(spell => spell.name == choice)		
	}	
}
const getConsumptionAmount = async (spell, choice) => {
	if (choice == s.allChoices[0]) {
		return 4
	} else if (choice == s.allChoices[1]) {
		return 1
	} else if (choice == s.allChoices[2]) {
		return 5
	} else {
		return 0
	}
}
const getDamage = async (spell, choice) => {
	const weapon = game.items.find(item => item.name == s.damageWeaponName)
	if (choice == s.allChoices[3] || choice == s.allChoices[4]) {
		return choice == s.allChoices[4] 
			? ["1d8 + @mod", "bludgeoning"] 
			: ["1d6 + @mod", "bludgeoning"]
	} else {
		return spell.system.damage.parts
	}
}
const getSpellIconPaths = (choice, spells) => {
	if (choice == s.allChoices[3] || choice == s.allChoices[4]) {
		return "icons/weapons/staves/staff-simple-spiral-green.webp"
	} else {
		const spell = spells.find(spell => spell.name.toLowerCase() == choice.toLowerCase())
		return spell.img		
	}
}
const getSpellsToCast = async (staff) => {
	const spells = s.spellNames.map(spell => game.items.find(item => {
		if (!item.name) return false
		return item.name.toLowerCase() == spell.toLowerCase()
	}))	
	const filteredSpellNames = s.spellNames.filter((spell, i, arr) => {
		return ((spell == arr[0] && staff.system.uses.value >= 4)
			||  (spell == arr[1] && staff.system.uses.value >= 1)
			||  (spell == arr[2] && staff.system.uses.value >= 5))
	})
	const choices = staff.system.attunement == 2 ? 
		[...s.meleeChoices, ...filteredSpellNames].sort() : 
		s.meleeChoices.sort()
	return [choices, spells]
}
const getTempSpellItem = async (spell, staff, updatedMacroNames, choice) => {
	const [amount, damage, item, name, prep, type] = await getTempSpellItemMods(spell, staff, choice)
	return mergeObject(duplicate(item.toObject(false)), {
		name: name,
		"flags.charname.staffOfSwarmingInsects.originItemName": staff.name,
		"flags.charname.staffOfSwarmingInsects.originItemUuid": staff.uuid,
		"flags.charname.staffOfSwarmingInsects.originName": item.name,
		"flags.charname.staffOfSwarmingInsects.originUuid": item.uuid,
		"flags.midi-qol.onUseMacroName": updatedMacroNames,
		"system.consume.amount": amount,
		"system.consume.target": staff.id,
		"system.consume.type": type,
		"system.damage.parts": damage,	
		"system.preparation.mode": prep,
	}, {overwrite: true, inlace: true, insertKeys: true, insertValues: true})	
}
const getTempSpellItemMods = async (spell, staff, choice) => {
	const amount = await getConsumptionAmount(choice)
	const damage = await getDamage(spell, choice)
	const item = choice == s.allChoices[3] || choice == s.allChoices[4] ? weapon : spell
	const name = item.name == s.damageWeaponName ? staff.name : spell.name
	const prep = choice == s.allChoices[3] || choice == s.allChoices[4] ? null : "innate"
	const type = choice == s.allChoices[3] || choice == s.allChoices[4] ? null : "charges"
	return [amount, damage, item, name, prep, type]
}
const onUse = async ({actor, args, item, token, workflow}) => {
	const staff = await fromUuid(item.uuid)
	if (!staff.system.equipped) return false
	const [choices, spells] = await getSpellsToCast(staff)
	const choice = await getDialogueButtonType(
		choices, 
		{width: choices.length * 150, height: "100%"}, 
		s.initHeader, 
		getSpellIconPaths, 
		60, 
		60, 
		spells
	)
	const chosenItem = await getChosenItem(choice.value, spells)
	const tokenActor = (await fromUuid(args[0].tokenUuid)).actor
	castSpell(chosenItem, staff, tokenActor, choice.value)	
}

export const staffOfSwarmingInsects = {
	deleteTempItem,
	onUse	
}