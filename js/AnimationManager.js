function switchAnimation(animationManager, name, fadeDuration) {
	if (animationManager) {
		animationManager.play(name, fadeDuration);
	}
}
class AnimationManager {
	constructor(mixer, animations) {
		this.mixer = mixer;
		this.actions = {};
		this.activeAction = null;

		animations.forEach((clip) => {
			this.actions[clip.name] = mixer.clipAction(clip);
			this.actions[clip.name].clampWhenFinished = true;
		});
	}

	play(name, fadeDuration = 0.5) {
		if (this.activeAction && this.activeAction._clip.name == name)
			return;

		const newAction = this.actions[name];

		if (undefined == newAction) {
			console.log('AnimationManager.play(', name, '): animation undefined.');
			return;
		}

		//if (this.activeAction === newAction) return;
		if (null != this.activeAction)
			this.activeAction.stop();

		newAction.reset();
		newAction.play();

		if (this.activeAction && fadeDuration > 0) {
			this.activeAction.crossFadeTo(newAction, fadeDuration, true);
		}

		this.activeAction = newAction;
	}

	stop() {
		if (this.activeAction) {
			this.activeAction.stop();
			this.activeAction = null;
		}
	}

	setTimeScale(speed = 1) {
		if (this.activeAction) {
			this.activeAction.timeScale = speed;
		}
	}
}