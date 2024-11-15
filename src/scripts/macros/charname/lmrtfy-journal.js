const getActorChoices = () => {
	const activeUsers = game.users.filter(u => u.active && !u.isGM)
	const actorsWithPlayerOwners = game.actors.filter(a => a.hasPlayerOwner == true)
	return actorsWithPlayerOwners.filter(a => activeUsers.find(u => { 
		return a.ownership[u.id] == 3
	}))
}
const getChoices = async (actors) => {
	const actorContent = await getContent(actors)
	return await Dialog.wait({
		title: 'LMRTFY Parameters',
		content: `
			<form class="flexcol" name="charname_lmrtfy">
				${actorContent}
				<div class="form-group">
					<label for="advantage">Advantage:</label>
					<select name="advantage">
					<option value="0">None</option>
					<option value="1">Advantage</option>
					<option value="2">Disadvantage</option>
					</select>
				</div>
				<div class="form-group">
					<label for="passive">Passive Floor:</label>
					<select name="passive">
					<option value="0">Off</option>
					<option value="1">On</option>
					</select>
				</div>
				<div class="form-group">
					<label for="take10">Can Take 10:</label>
					<select name="take10">
					<option value="false">No</option>
					<option value="true">Yes</option>
					</select>
				</div>
			</form>
		`,
		buttons: {
			enter: {
				icon: '<i class="fas fa-check"></i>',
				label: 'Confirm',
				callback: (html) => {
					return [
						actors.map(a => {
							const name = a.name	
							return [
								a.name, 
								a.id, 
								html.find(`[name="${name}"]`)[0].checked == true
							]
						}), 
						html.find(`[name="advantage"]`).val(),
						html.find(`[name="passive"]`).val(),
						html.find(`[name="take10"]`).val()
					]
				}
			},
		},
		default: 'enter',
		close: () => {}
	})
}
const getContent = async (actors) => {
	return actors.reduce((choices, actor) => {	
		const choice = actor.name 
		return choices + 
		    `<div class="form-group">
				<label for="${choice}">${choice}</label>
				<input name="${choice}" label="${choice}" type="checkbox">
			</div>`
	}, ``)
}
const getData = (abilities, skills, title, canFailChecks, actorIds, advantage, allowsTake10, customPageId, pageName, passiveFloor) => {
	const advInt = parseInt(advantage)
	const canFail = passiveFloor == 1 ? false : canFailChecks 
	let messageArr = pageName.split(" ")
	messageArr.shift()
	const message = messageArr.join(" ")
	//as far as I can tell, there's no way to make the fail roll options not show up without disabling them completely
	//leaving code since I may end up expanding this to no longer use lmrtfy soon 
	return {
		"user": "character",
		"actors": actorIds,
		"abilities": abilities,
		"saves": [],
		"skills": skills,
		"advantage": advInt,
		"mode": "publicroll",
		"title": title,
		"message": message,
		"formula": "",
		"deathsave": false,
		"initiative": false,
		"tables": [],
		"chooseOne": true,
		"canFailChecks": true
	}	
}
const getHookData = async (abilities, skills, title, canFailChecks, choices, customPageId, pageName) => {
	const [actorChoices, advantage, passiveFloor, allowsTake10] = choices
	const actorIds = actorChoices.filter(c => c[2]).map(c => c[1])
	const data = getData(abilities, skills, title, canFailChecks, actorIds, advantage, allowsTake10, customPageId, pageName, passiveFloor)
	const request = await game.socket.emit('module.lmrtfy', data)
	return [actorIds, allowsTake10, data, passiveFloor, request]
}
const getSessionData = (message, rollId) => {
	const sessionId = "lmrtfy_" + rollId
	const sessionOld = sessionStorage.getItem(sessionId) ?? ""
	const split = sessionOld.split(",")
	const sessionSet = new Set(split)
	const sessionNew = sessionSet.add(message.speaker.actor)
	return [sessionId, sessionNew]
}
const main = async ([abilities, skills, title, canFailChecks, outcomes, pageName]) => {
	const customPageId = pageName.split(" ")[1]
	const actorChoices = await getActorChoices()
	if (actorChoices.length < 1) return false
	const choices = await getChoices(actorChoices)
	const [actorIds, allowsTake10, data, passiveFloor, request] = await getHookData(abilities, skills, title, canFailChecks, choices, customPageId, pageName)
	setHooks(actorIds, allowsTake10, data, outcomes, pageName, passiveFloor, request.id) 
}
const sendChatMessages = (content, userId) => {
	console.log("userId")
	console.log(userId)
	const userName = (game.users.find(user => user.id == userId)).name
	ChatMessage.create({
		content: content,
		whisper: ChatMessage.getWhisperRecipients(userName),
	})
}
const setHooks = async (actorIds, allowsTake10, data, outcomes, pageName, passiveFloor, rollId) => {
	const date = new Date()
	const time = date.getTime()
	let messageArr = pageName.split(" ")
	messageArr.shift()
	const ourMessage = messageArr.join(" ")	
	const messageHookId = Hooks.on("createChatMessage", (message, config, userId) => {		
		const lmrtfyMessage = message?.flags?.lmrtfy?.message ?? false
		if (!lmrtfyMessage) return false
		//give the players 30 seconds to answer the roll request or the request becomes invalid
		if (
			lmrtfyMessage == ourMessage
			&& data.skills.find(s => s == message.flags.dnd5e.roll.skillId) 
			//leaving out saving throws for now b/c I'd rather use item/trap macros for that
			&& ["check", "skill"].includes(message.flags.dnd5e.roll.type)
			&& actorIds.includes(message.speaker.actor)
		) {
			const [sessionId, sessionNew] = getSessionData(message, rollId)
		    updatePages(allowsTake10, data, message, message.user.id, outcomes, passiveFloor)
			if (sessionNew.size - 1 == actorIds.length
				|| time < message.timestamp - 30000
			) {
				Hooks.off("createChatMessage", messageHookId)
				sessionStorage.removeItem(sessionId)
				return false
			}
			const sessionUpdate = Array.from(sessionNew).join(",")
			sessionStorage.setItem(sessionId, sessionUpdate)
		}
	})	
}
const updateOwnership = (outcome, userId) => {
	game.journal.forEach(e => e.pages.forEach(p => {
		const pageId = p.name.split(" ")[0]
		if (pageId == outcome.journalPageId) {
			let ownership = p.ownership	
			ownership[userId] = 2
			p.update({"ownership": ownership})
			sendChatMessages(p.text.content, userId)
		}
	}))
}
const updatePages = (allowsTake10, data, message, userId, outcomes, passiveFloor) => {
	const actor = game.actors.find(a => a.id == message.speaker.actor)	
	outcomes.forEach(oc => {
		const passiveSkill = actor.system.skills[message.flags.dnd5e.roll.skillId].passive
		if (
			(oc.skills.find(s => s == message.flags.dnd5e.roll.skillId) 
			&& message.rolls[0]._total >= oc.score)
			|| (oc.skills.find(s => s == message.flags.dnd5e.roll.skillId) 
				&& passiveSkill >= oc.score 
				&& passiveFloor == 1
				&& !allowsTake10)
			|| (oc.skills.find(s => s == message.flags.dnd5e.roll.skillId) 
				&& passiveSkill >= oc.score 
				&& allowsTake10
				&& message.rolls[0]._total < -40)				
			|| (oc.items.length > 0 
				&& actor.items.find(item => oc.items.includes(item.name)))
			|| (oc.races.length > 0 
				&& oc.races.includes(actor.system.details.race))
		) { 
			updateOwnership(oc, userId) 
		}
	})
}

export const lmrtfyJournal = {
	"main": main
}