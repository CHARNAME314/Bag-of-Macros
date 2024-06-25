//todo:
//**add first part where you as the DM get the dialog to choose if you get advantage or not (and select which players should be rolling)
//**set up hook to get players' chosen skills and their rolls
//**set up logic gates to reveal pages to the characters 
//**extract out variables I need and stick them up top so it's easy to copy this 
//**optionally add a whisper to the player depending on their roll 
//**make sure this works for multiple people at a time!  I think the hook only works once right now 
//**add functionality for saving throws 
//**fix how multiple outcomes are going to work.  The naming convention stuff is off 
//**Make sure there is handling for when a player leaves the request window open too long or closes it without choosing an option 
//don't forget the title text 
//**still an issues: if I do two rolls with the same skill on the same person twice before the first roll has been completed, the first roll completes them both 
//extract out to mod at some point 
//**add passive floor handling 
//**add take 10s

const abilities = []
const skills = ["acr", "arc"]
const title = "What do you want to do?"
const canFailChecks = false
const customPageId = this.name.split(" ")[1]

//should be able to add as many outcomes as desired, just add to the array
const outcomes = [ 
	{
		items:			[],
		journalPageId:	"08.4G.AA.01",
		races:			[],
		skills: 		['acr'],
		score: 			50
	},{
		items:			[],
		journalPageId:	"08.4G.AA.01",
		races:			[],
		skills: 		['arc'],
		score: 			1
	},{
		items:			[],
		journalPageId:	"08.4G.AA.02",
		races:			[],
		skills: 		['acr'],
		score: 			11
	}
]

//////////////////////////////////MACRO STUFF ABOVE 


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
const getData = (actorIds, advantage, allowsTake10, customPageId) => {
	const advInt = parseInt(advantage)
	return {
		"user": "character",
		"actors": actorIds,
		"abilities": abilities,
		"saves": [],
		"skills": skills,
		"advantage": advInt,
		"mode": "publicroll",
		"title": title,
		"message": customPageId,
		"formula": "",
		"deathsave": false,
		"initiative": false,
		"tables": [],
		"chooseOne": true,
		"canFailChecks": true
	}	
}
//LEFT OFF LOOKING AT CAN FAIL CHECKS TO SEE IF I CAN USE THEM FOR TAKE 10.  Don't forget I only partially added a TAKE 10 thing up above
const getHookData = async (choices, customPageId) => {
	const [actorChoices, advantage, passiveFloor, allowsTake10] = choices
	const actorIds = actorChoices.filter(c => c[2]).map(c => c[1])
	const data = getData(actorIds, advantage, allowsTake10, customPageId)
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
const sendChatMessages = (content, userId) => {
	ChatMessage.create({
		content: content,
		whisper: ChatMessage.getWhisperRecipients('Darien'),
	})
}
const setHooks = async (actorIds, allowsTake10, customPageId, data, outcomes, passiveFloor, rollId) => {
	const date = new Date()
	const time = date.getTime()
	const messageHookId = Hooks.on("createChatMessage", (message, config, userId) => {		
		//give the players 30 seconds to answer the roll request or the request becomes invalid
		if (
			message.flags.lmrtfy.message == customPageId
			&& data.skills.find(s => s == message.flags.dnd5e.roll.skillId) 
			//leaving out saving throws for now b/c I'd rather use item/trap macros for that
			&& ["check", "skill"].includes(message.flags.dnd5e.roll.type)
			&& actorIds.includes(message.speaker.actor)
		) {
			const [sessionId, sessionNew] = getSessionData(message, rollId)
		    updatePages(allowsTake10, customPageId, data, message, message.user.id, outcomes, passiveFloor)
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
const updatePages = (allowsTake10, customPageId, data, message, userId, outcomes, passiveFloor) => {
	const actor = game.actors.find(a => a.id == message.speaker.actor)	
	outcomes.forEach(oc => {
		const passiveSkill = actor.system.skills[message.flags.dnd5e.roll.skillId].passive
		if (
			(oc.skills.find(s => s == message.flags.dnd5e.roll.skillId) 
			&& message.rolls[0]._total >= oc.score)
			|| (oc.skills.find(s => s == message.flags.dnd5e.roll.skillId) 
				&& passiveSkill >= oc.score 
				&& passiveFloor == 1)
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

const main = async (customPageId) => {
	const actorChoices = await getActorChoices()
	if (actorChoices.length < 1) return false
	const choices = await getChoices(actorChoices)
	const [actorIds, allowsTake10, data, passiveFloor, request] = await getHookData(choices, customPageId)
	setHooks(actorIds, allowsTake10, customPageId, data, outcomes, passiveFloor, request.id) 
}

main(customPageId)