//have this as a DIME macro since it's only partially my code
try {
    async function success(targetToken) {
		if (MidiQOL.hasCondition(targetToken, "Grappled")) return;
		let se = CONFIG.statusEffects.find(i => {
				if (i.statuses instanceof Set) return i.statuses.has("Convenient Effect: Grappled")
				return i.statuses?.find(s => s === "Convenient Effect: Grappled")
		})
		if (!se) se = CONFIG.statusEffects.find(i => i.id === "grappled")
		targetToken.toggleEffect(se, {active: true})
	}

	if (!token) token = MidiQOL.tokenForActor(actor)
	if (!token) {
		ui.notifications.warn(`${actor.name} does not have a token on the canvas`)
		return
	}
	let target = workflow.targets?.first();
	if (!target ) {
		ui.Notificatons.warn(`${item.name} must have a token targeted`)
		return
	}
	const tokenSize = token.actor.system.traits.size;
	const targetSize = target.actor.system.traits.size;
	const tokenSizeNum = Object.keys(CONFIG.DND5E.actorSizes).indexOf(tokenSize);
	const targetSizeNum = Object.keys(CONFIG.DND5E.actorSizes).indexOf(targetSize); 
	if (targetSizeNum - tokenSizeNum > 1) {
		ui.notifications.warn(`${item.name} creature size difference too great ${token.name}:${CONFIG.DND5E.actorSizes[tokenSize]} vs ${target.name}:${CONFIG.DND5E.actorSizes[targetSize]}`)
		return
	}
	const targetSkill = target.actor.system.skills.ath.total > target.actor.system.skills.acr.total ? "ath" : "acr";
	const roll = await MidiQOL.contestedRoll({
		source: {token, rollType: "skill", ability: "Athletics"},
		target: {token: target, rollType: "skill", ability: targetSkill},
		flavor: item.name, displayResults: true, itemCardId: workflow.itemCardId, 
		rollOptions: {fastForward: false, chatMessage: true, rollMode: "gmroll"}
	})
	if (roll.result > 0) await success(target)
	
} catch (err) {
    console.error(`${item.name} item macro error`, err)
}