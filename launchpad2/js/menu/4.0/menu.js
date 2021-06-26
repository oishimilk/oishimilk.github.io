/*
操作盤制御と設定変更スクリプト
Copyright (C) 2015 - 2020 oishimilk. Some rights reserved.

ひどいです。
*/

console.info("%cmenu.js, dev4.7.2020.06.24.60 / Copyright (C) 2015-2020 oishimilk. Some rights reserved.", "background-color: darkseagreen;");

function updateManipulator(){
	//console.debug("操作盤を更新します。");
	if (controller2.style.opacity) {
		for (const id in MMDModelInformationArray) {
			if (!document.getElementById("MorphManipulator" + id).hidden) updateMorphManipulator(id);
		}
	}
}

function startPlaying(loop){
	console.log("再生を開始します。");
	for (const id in MMDAnimationArray) {
		stopMMDMotion(id);
		playMMDMotion(id, loop);
	}
	tryToSync();
}

function pausePlaying(){
	console.log("再生を一時停止します。");
	for (const id in MMDAnimationArray) {
		pauseMMDMotion(id);
	}
}

function stopPlaying(){
	console.log("再生を停止します。");
	for (const id in MMDAnimationArray) {
		stopMMDMotion(id);
	}
}

function tryToSync(){
	console.log("音声-映像同期を試行します。");
	if (MusicEnableSync.checked) {
		if (music.currentTime + OffsetTime.valueAsNumber < 0) {
			console.log("モーション時刻が負になるとバグるっぽいので、音源時刻を無理やり進めてモーション時刻を正にします。");
			music.currentTime -= OffsetTime.valueAsNumber; //OffsetTimeは絶対に負です。
		}
		for (const i in MMDAnimationArray) {
			for (let j = 0; j < MMDAnimationArray[i].length; j++) {
				//Edge で OffsetTime.valueAsNumber が強制的に NaN になるバグに遭遇 (最新ビルドで解決済みらしい)
				//MMDAnimationArray[i][j].time = music.currentTime + Number(OffsetTime.value);
				MMDAnimationArray[i][j].time = music.currentTime + OffsetTime.valueAsNumber;
				console.log("MMDAnimationArray[" + i +"][" + j + "]: Time = " + MMDAnimationArray[i][j].time);
			}
		}
	}
}

function changeTimeScale(val){
	console.log("時間スケールを変更します。");
	for (const i in MMDAnimationArray) {
		for (let j = 0; j < MMDAnimationArray[i].length; j++) {
			MMDAnimationArray[i][j].timeScale = val;
			console.log("MMDAnimationArray[" + i +"][" + j + "]: timeScale = " + MMDAnimationArray[i][j].timeScale);
		}
	}
}

function playMMDMotion(id, loop){
	console.log("モデル" + id + "に紐付けられたモーションの再生を開始します。ループ: " + loop);

	const anim = MMDAnimationArray[id];
	
	for (let i = 0; i < anim.length; i++) {
		if (loop) {
			anim[i].repetitions = Infinity;
		} else {
			anim[i].repetitions = 0;
		}
		anim[i].paused = false;
		anim[i].play();
		console.log("再生開始: MMDAnimationArray[" + id + "][" + i + "]");
	}
}

function pauseMMDMotion(id) {
	console.log("モデル" + id + "に紐付けられたモーションの再生を一時停止します。");
	const anim = MMDAnimationArray[id];
	
	for (let i = 0; i < anim.length; i++) {
		anim[i].paused = true;
	}
}

function stopMMDMotion(id) {
	console.log("モデル" + id + "に紐付けられたモーションの再生を停止します。");
	const anim = MMDAnimationArray[id];
	
	for (let i = 0; i < anim.length; i++) {
		anim[i].paused = false;
		anim[i].stop();
	}
}

function disposeMMDMotion(id){
	console.log("モデル" + id + "に紐付けられたモーションを破棄します。");
	
	const obj = MMDHelper.objects.get(MMDScene.getObjectById(id));
	
	if (obj.mixer !== undefined) {
		obj.mixer.stopAllAction();
		delete obj.mixer;
	}
	
	MMDAnimationArray[id] = null;
	MMDAnimationInformationArray[id] = null;
	delete MMDAnimationArray[id];
	delete MMDAnimationInformationArray[id];
	
	//カメラモーションかもしれない
	if (MMDScene.getObjectById(id).type == "SkinnedMesh") {
		MMDScene.getObjectById(id).skeleton.pose();
		initMorphInfluences(id);
	}
}

function changeCameraControlType(mode){
	console.log("視点制御を" + mode + "モードに変更します。");
	
	if (mode == "Trackball") {
		CameraControls = new THREE.TrackballControls( Camera, MMDRenderer.domElement );
		ActiveCamera = Camera;
	} else if (mode == "Orbit") {
		CameraControls = new THREE.OrbitControls( Camera, MMDRenderer.domElement );
		ActiveCamera = Camera;
	} else if (mode == "Auto") {
		ActiveCamera = MMDCamera;
	} else {
		console.warn(mode + "は未定義です。");
	}
}

function toggleSceneFog(bool) {
	console.log("シーンの霧: " + bool);
	if (bool) {
		MMDScene.fog = MMDSceneFog;
	} else {
		MMDScene.fog = null;
	}
}

function changeSceneColor(color, mode) {
	console.log(mode + "の色を" + color + "に変更します。");
	
	const col = new THREE.Color(color);
	if (mode == 'background') {
		MMDScene.background = col;
		MMDSceneFog.color = col;
	} else if (mode == 'ambient') {
		MMDAmbientLight.color = col;
	} else if (mode == 'light') {
		MMDLight.color = col;
	} else {
		console.warn(mode + "は未定義です。");
	}	
}

function performMaterialEmissiveBugWorkAround(id){
	//テクスチャが異様に明るい現象の対策
	console.log("モデルID" + id + "の色がおかしいみたいなので何とかします。");
	
	const materials = MMDScene.getObjectById(id).material;
	for (const mat in materials) {
		materials[mat].emissiveIntensity = 0;
	}
}

function performMaterialTransparentBugWorkAround(id){
	//透過バグ対策
	console.log("モデルID" + id + "で透過バグが起こったようなので何とかします。");
	
	const materials = MMDScene.getObjectById(id).material;
	for (const mat in materials) {
		materials[mat].transparent = true;
	}
}

function loadMMDModel(url){
	if (url == "null") return;
	
	console.log(url + "よりMMDモデルを読み込んでいます...");
	console.time("Model Fetch");
	
	ModelManipulator.insertAdjacentHTML('afterbegin', "<progress id=\"MMDModelLoadProgress\" style=\"width: 100%;\"></progress>");
	
	MMDLoader.load(
		url,
		function (xhr) {
			console.timeEnd("Model Fetch");
			
			console.time("Model Registration");
			console.log("読み込んだモデルをシーンに追加しています...");
			MMDScene.add(xhr);
			MMDHelper.add(xhr);

			console.log("Inverse Kinematics の準備をしています...");
			const ikHelper = MMDHelper.objects.get(xhr).ikSolver.createHelper();
			ikHelper.visible = false;
			MMDScene.add(ikHelper);

			console.log("物理演算の準備をしています...");
			const physicsHelper = MMDHelper.objects.get(xhr).physics.createHelper();
			physicsHelper.visible = false;
			MMDScene.add(physicsHelper);
			
			//アニメーションのための準備
			MMDAnimationArray[xhr.id] = [];
			
			createModelManipulator(xhr.id);
			MMDModelLoadProgress.remove();
			console.timeEnd("Model Registration");
			console.info("モデルを追加しました。");
		},
		function (xhr) {
			if (xhr.lengthComputable) {
				//火狐様に怒られるから
				MMDModelLoadProgress.value = xhr.loaded / xhr.total;
			}
		},
		function (xhr) {
			console.timeEnd("Model Fetch");
			console.error("MMDモデルを読み込む際に問題が発生しました。");
			console.log(xhr);
			MMDModelLoadProgress.remove();
		}
	);
}

function loadMMDMotion(url, id){
	console.log(url + "よりモデル" + id + "に対してMMDモーションを読み込んでいます...");
	console.time("Motion Fetch");
	
	if (Array.isArray(MMDAnimationInformationArray[id]) === false) MMDAnimationInformationArray[id] = [];

	const mesh = MMDScene.getObjectById(id);
	const element = document.getElementById("RegisteredModelMotionList" + id);
	if (element === null) {
		element = RegisteredCameraMotionList;
	}
	
	element.insertAdjacentHTML('afterbegin', "<progress id=\"MMDMotionLoadProgress\" style=\"width: 100%;\"></progress>");

	MMDLoader.loadAnimation(
		url,
		mesh,
		function (xhr) {
			console.timeEnd("Motion Fetch");
			
			//MMDAnimationHelper.js を参考にしています。
			const objects = MMDHelper.objects.get(mesh);
			if (objects.mixer === undefined) objects.mixer = new THREE.AnimationMixer(mesh);
			if (Array.isArray(MMDAnimationArray[id]) === false) MMDAnimationArray[id] = [];
			MMDAnimationArray[id].push(objects.mixer.clipAction( xhr )); //してはいけない
			MMDHelper.objects.set(xhr, {duration: xhr.duration}); //syncDuration()
			MMDMotionLoadProgress.remove();
			
			console.info("モーションを追加しました。");
		},
		function (xhr) {
			if (xhr.lengthComputable) {
				//火狐様に叱られるから
				MMDMotionLoadProgress.value = xhr.loaded / xhr.total;
			}
		},
		function (xhr) {
			console.timeEnd("Motion Fetch");
			console.error("モーションを読み込む際に問題が発生しました。");
			console.log(xhr);
			MMDMotionLoadProgress.remove();
		}
	);
}

function disposeMMDModel(id){
	console.log("モデル" + id + "を破棄しています...");

	disposeMMDMotion(id); //関連付けられたモーションを削除

	const victim = MMDScene.getObjectById(id);
	MMDHelper.remove(victim);
	
	//関連するオブジェクトの削除
	for (let i = 0; i < MMDScene.children.length; i++) {
		const obj = MMDScene.children[i];
		if (obj.root === undefined || obj.root.uuid === undefined) continue;
		if (MMDScene.children[i].root.uuid == victim.uuid) {
			console.log("シーンから関連するオブジェクトを削除します。");
			MMDScene.remove(MMDScene.children[i]);
			i--; //捨てた分減るので
		}
	}
	
	//闇に葬り去る
	console.log("シーンから分離しています...");
	MMDScene.remove(victim); //シーンから分離
	victim.geometry.dispose();
	
	console.log("MMDModelInformationArray[" + id + "]を抹消しています...");
	MMDModelInformationArray[id] = null;
	delete MMDModelInformationArray[id];
	
	//証拠隠滅
	console.log("操作盤からモデル" + id + "を除去しています...");
	document.getElementById("ModelManipulator" + id).remove();
	
	console.info("モデルを破棄しました。");
	console.warn("メモリリークが起きました？必要ならば手動でGCを実行してください。");
}

function toggleCameraAsLight(bool) {
	console.log("カメラは光源: " + bool);
	if (bool) {
		MMDLight.parent = MMDCamera;
	} else {
		MMDLight.parent = MMDScene;
	}
}

function toggleIKVisibility(id, bool) {
	const uuid = MMDScene.getObjectById(id).uuid;
	for (let i = 0; i < MMDScene.children.length; i++) {
		const obj = MMDScene.children[i];
		if (obj.root === undefined || obj.root.uuid === undefined) continue;
		if (obj.root.uuid == uuid && obj.iks !== undefined) {
			console.log("モデル" + id + "のIK表示:" + bool);
			obj.visible = bool;
			break;
		}
	}
}

function togglePhysicsVisibility(id, bool) {
	const uuid = MMDScene.getObjectById(id).uuid;
	for (let i = 0; i < MMDScene.children.length; i++) {
		const obj = MMDScene.children[i];
		if (obj.root === undefined || obj.root.uuid === undefined) continue;
		if (obj.root.uuid == uuid && obj.physics !== undefined) {
			console.log("剛体の表示:" + bool);
			obj.visible = bool;
			break;
		}
	}
}

function forceUpdateMaterials(id) {
	console.log("モデル" + id + "の材質の更新を WebGLRenderer に伝えています。");

	const materials = MMDScene.getObjectById(id).material;
	for (const i in materials) {
		materials[i].needsUpdate = true;
	}
}

function changeGravity(){
	console.log("シーンの重力加速度ベクトル: (" + gravityX.value + ", " + gravityY.value + ", " + gravityZ.value + ")");
	
	for (let i = 0; i < MMDScene.children.length; i++) {
		const obj = MMDScene.children[i];
		if (obj.physics === undefined) continue;
		obj.physics.setGravity(new THREE.Vector3(gravityX.value, gravityY.value, gravityZ.value));
	}
}

function initPhysics(id){
	console.log("モデル" + id + "の剛体を初期化します。");
	console.warn("この機能は動きません？");

	const uuid = MMDScene.getObjectById(id).uuid;
	for (let i = 0; i < MMDScene.children.length; i++) {
		const obj = MMDScene.children[i];
		
		if (obj.physics === undefined) continue;
		if (obj.root === undefined) continue;
		
		if (obj.root.uuid == uuid) {
			obj.physics.reset();
			break;
		}
	}
}

function toggleIK(id, bool){
	console.log("モデル" + id + "のIK: " + bool);

	const mesh = MMDScene.getObjectById(id);
	
	//MMDAnimationHelper.jsからのコピペ
	const iks = mesh.geometry.userData.MMD.iks;
	const bones = mesh.geometry.userData.MMD.bones;

	for (let i = 0, il = iks.length; i < il; i++) {
		const ik = iks[i];
		const links = ik.links;

		for (let j = 0, jl = links.length; j < jl; j++) {
			const link = links[ j ];
			
			// disable IK of the bone the corresponding rigidBody type of which is 1 or 2
			// because its rotation will be overriden by physics
			if (bones[link.index].rigidBodyType > 0) continue;
			
			link.enabled = bool;
		}
	}
}

function changeRigidMode(id, mode){
	console.log("モデル" + id + "の物理演算モード:" + mode);

	const uuid = MMDScene.getObjectById(id).uuid;
	
	for (let i = 0; i < MMDScene.children.length; i++) {
		const target = MMDScene.children[i];
		if (target.physics === undefined) continue;
		if (target.root === undefined) continue;
		if (target.root.uuid == uuid) {
			for (let j = 0; j < target.physics.bodies.length; j++) {
				target.physics.bodies[j].params.type = mode;
			}
		}
	}
}

function createMaterialManipulator(id){
	console.log("モデル" + id + "の材質制御盤を作成しています...");

	const mat = MMDModelInformationArray[id].materials; //MMDScene.getObjectById(id).materialと一致することを祈る
	let temp = "";
	
	for (let i = 0; i < mat.length; i++) {
		//console.debug("作成中: " + mat[i].name);
	
		temp += "<option value=\"" + i + "\">";
			temp += escapeString(mat[i].name);
			if (mat[i].englishName != "") {
				temp += " (" + escapeString(mat[i].englishName) + ")";
			}
			if (mat[i].comment != "") {
				temp += " --" + escapeString(mat[i].comment);
			}
		temp += "</option>";
	}
	return temp;
}

function showMaterialProp(id, mat){
	console.log("モデル" + id + "の材質" + mat + "のプロパティを表示します。");

	const material = MMDScene.getObjectById(id).material[mat];
	
	document.getElementById("MaterialManipulator" + id + "Visibility").checked = material.visible;
	document.getElementById("MaterialManipulator" + id + "FlatShading").checked = material.flatShading;
	document.getElementById("MaterialManipulator" + id + "Transparency").checked = material.transparent;
	document.getElementById("MaterialManipulator" + id + "DepthTest").checked = material.depthTest;
	document.getElementById("MaterialManipulator" + id + "Wireframe").checked = material.wireframe;
	
	const opacity = document.getElementById("MaterialManipulator" + id + "Opacity");
	opacity.value = material.opacity * opacity.max;
	
	document.getElementById("MaterialManipulator" + id + "Shininess").value = material.shininess;
}

function makePhongMaterials(id, mode){
	console.log("モデル" + id + "の Phong シェーディング: " + mode);

	const materials = MMDScene.getObjectById(id).material;
	
	if (mode) console.warn("この操作はマテリアルを壊します？");
	
	for (let i = 0; i < materials.length; i++) {
		let newMaterial;
		if (mode) {
			newMaterial = new THREE.MeshPhongMaterial();
		} else {
			newMaterial = new THREE.MeshToonMaterial();
		}
		newMaterial.copy(materials[i]);
		newMaterial.needsUpdate = true;
		materials[i] = newMaterial;
	}
}

function initMorphInfluences(id){
	console.log("モデル" + id + "のモーフを初期化します。");

	const morph_array = MMDScene.getObjectById(id).morphTargetInfluences;
	for (let j = 0; j < morph_array.length; j++) {
		morph_array[j] = 0;
		document.getElementById("MorphMan-" + id + "-" + j).value = 0;
		document.getElementById("MorphMan-" + id + "-" + j).style = "background-color: transparent;";
	}
}

function updateMorphManipulator(id) {
	//console.debug("モデル" + id + "のモーフ制御盤を更新します。");

	const morph_influences_list = MMDScene.getObjectById(Number(id)).morphTargetInfluences;
	for (let j=0, len = morph_influences_list.length; j < len; j++) {
		//console.debug("更新中: " + j);
	
		const man = document.getElementById("MorphMan-" + id + "-" + j);
		const slider = document.getElementById("MorphSlider-" + id + "-" + j);
		const flu = morph_influences_list[j];
		
		if (slider.value < flu) {
			man.style = "background-color: pink;";
			man.hidden = false;
		} else if (slider.value > flu) {
			man.style = "background-color: skyblue;";
			man.hidden = false;
		} else {
			//関連: setMorphManipulator();
			if (man.style.backgroundColor !== "khaki") man.style = "background-color: transparent;";
			continue;
		}
		
		slider.value = flu;
	}
}

function setMorphManipulator(id, morph, value) {
	//関連: updateMorphManipulator();
	//console.debug("モデル" + id + "のモーフ" + morph + "の値を" + value + "にします。");
	
	document.getElementById("MorphMan-" + id + "-" + morph).style = "background-color: khaki;";
	MMDScene.getObjectById(id).morphTargetInfluences[morph] = value;
}

function setIsMorphManipulatorAdaptive(id, bool) {
	console.log("モデル" + id + "のモーフ制御盤の適応表示: " + bool);

	for (let i = 0; i < MMDModelInformationArray[id].morphs.length; i++) {
		const man = document.getElementById("MorphMan-" + id + "-" + i);
		if (bool) {
			man.hidden = true;
		} else {
			man.hidden = false;
		}
	}
}

function createMorphManipulator(id){
	console.log("モデル" + id + "のモーフ制御盤を作成しています...");

	const morphs = MMDModelInformationArray[id].morphs;
	let temp = "";
	
	for (let i = 0, len = morphs.length; i < len; i++) {
		//console.debug("作成中: " + morphs[i].name);
	
		temp += "<tr id=\"MorphMan-" + id + "-" + i + "\">"
			+ "	<th>"
			+ escapeString(morphs[i].name);
		
		if (morphs[i].englishName != "") {
			temp += "<br>" + escapeString(morphs[i].englishName);
		}
		
		temp += "	</th>"
			+ "	<td>"
			+ "		<input type=\"range\" class=\"morph_slider\" max=\"1\" value=\"0\" step=\"any\" id=\"MorphSlider-" + id + "-" + i + "\" oninput=\"setMorphManipulator(" + id + ", " + i + ", this.value);\">"
			+ "	</td>"
			+ "</tr>";
	}
	
	return temp;
}

function escapeString(str) {
	//console.debug("禁則処理: " + str);

	//順番注意 - &の置換を先頭においてください。
	return str.replace(/&/g, '&amp;')
		.replace(/"/g, '&quot;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
}

function createModelManipulator(id) {
	console.log("モデル" + id + "の制御盤を作成しています...");

	const obj = MMDScene.getObjectById(id);
	const metadata = MMDModelInformationArray[id].metadata;
	
	const temp = ""
	+ "<div id=\"ModelManipulator" + id + "\">"
	+ "<hr>"
	+ "<table>"
	+ "	<tr>"
	+ "		<th><a title=\"" + escapeString(metadata.comment) + "\">名前</a></th>"
	+ "		<td>" + escapeString(metadata.modelName) + "</td>"
	+ "	</tr>"
	+ "	<tr>"
	+ "		<th><a title=\"" + escapeString(metadata.englishComment) + "\">英名</a></th>"
	+ "		<td>" + escapeString(metadata.englishModelName) + "</td>"
	+ "	</tr>"
	+ "	<tr>"
	+ "		<th>識別</th>"
	+ "		<td>No. " + id + "</td>"
	+ "	</tr>"
	+ "	<tr>"
	+ "		<th>操作</th>"
	+ "		<td>"
	+ "			<a href=\"javascript:void(console.log(MMDScene.getObjectById(" + id + ")), console.log(MMDModelInformationArray[" + id + "]));\" title=\"このモデルをコンソールに出力します。\">デバッグを開始</a>"
	+ "			または"
	+ "			<a href=\"javascript:void(disposeMMDModel(" + id + "));\" title=\"モデルをシーンから削除します。メモリリークします...\">&#9888;このモデルを削除</a>"
	+ "		</td>"
	+ "	</tr>"
	+ "	<tr>"
	+ "		<th>形状</th>"
	+ "		<td>"
	+ "			頂点: " + metadata.vertexCount + "個 / 面: " + metadata.faceCount + "枚 (" + metadata.magic + metadata.version + ")<br>"
	+ "			表示: <input type=\"range\" oninput=\"MMDScene.getObjectById(" + id + ").geometry.drawRange.count = this.value;\" step=\"3\" max=\"" + obj.geometry.index.count + "\" value=\"" + obj.geometry.index.count + "\" disabled>" 
	+ "		</td>"
	+ "	</tr>"
	+ "	<tr>"
	+ "		<th>材質</th>"
	+ "		<td>"
	+ 			metadata.materialCount + "種 (テクスチャ" + metadata.textureCount + "枚)<br>"
	+ "			<a href=\"javascript:void(forceUpdateMaterials(" + id + "));\" title=\"反映されていない変更の適用を強制します。\">強制更新</a>"
	+ "			<a href=\"javascript:void(performMaterialEmissiveBugWorkAround(" + id + "));\" title=\"異様に明るい場合に対策を施します。\">色が変</a>"
	+ "			<a href=\"javascript:void(performMaterialTransparentBugWorkAround(" + id + "));\" title=\"透過バグが発生した際に使用します。\">透過バグ対策</a>"
	+ "			<hr>"
	+ "			<select id=\"MaterialManipulator" + id + "\" onchange=\"showMaterialProp(" + id + ", this.value);\" style=\"width: 100%;\">"
	+ "				<option value=\"null\" selected disabled>編集するマテリアルを選択してください...</option>"
	+ 				createMaterialManipulator(id)
	+ "			</select>"
	+ "			<br>"
	//ここからスパゲッティ
	+ "			<input type=\"checkbox\" id=\"MaterialManipulator" + id + "Visibility\" onclick=\"MMDScene.getObjectById(" + id + ").material[MaterialManipulator" + id + ".value].visible = this.checked;\" title=\"この材質をレンダリングします。\" disabled>可視"
	+ "			<input type=\"checkbox\" id=\"MaterialManipulator" + id + "FlatShading\" onclick=\"MMDScene.getObjectById(" + id + ").material[MaterialManipulator" + id + ".value].flatShading = this.checked;\" title=\"フラットシェーディングにします。\">平坦" //needsUpdate = true が必要?
	+ "			<input type=\"checkbox\" id=\"MaterialManipulator" + id + "Transparency\" onclick=\"MMDScene.getObjectById(" + id + ").material[MaterialManipulator" + id + ".value].transparent = this.checked;\" title=\"透過を有効化します。\">透明"
	+ "			<input type=\"checkbox\" id=\"MaterialManipulator" + id + "DepthTest\" onclick=\"MMDScene.getObjectById(" + id + ").material[MaterialManipulator" + id + ".value].depthTest = this.checked;\" title=\"他の物体によって遮られるようになります。\">深度テスト"
	+ "			<br>"
	+ "			<input type=\"checkbox\" id=\"MaterialManipulator" + id + "Wireframe\" onclick=\"MMDScene.getObjectById(" + id + ").material[MaterialManipulator" + id + ".value].wireframe = this.checked;\" title=\"ワイヤフレームを表示します。\">ワイヤフレーム"
	+ "			<br>"
	+ "			不透明度<input type=\"range\" value=\"0\" max=\"100\" min=\"0\" id=\"MaterialManipulator" + id + "Opacity\" oninput=\"MMDScene.getObjectById(" + id + ").material[MaterialManipulator" + id + ".value].opacity = this.value / this.max;\" disabled>"
	+ "			<br>"
	+ "			反射強度<input type=\"range\" value=\"0\" max=\"500\" min=\"1\" id=\"MaterialManipulator" + id + "Shininess\" oninput=\"MMDScene.getObjectById(" + id + ").material[MaterialManipulator" + id + ".value].shininess = this.value;\">"
	//ここまでスパゲッティ
	+ "		</td>"
	+ "	</tr>"
	+ "	<tr>"
	+ "		<th>物理</th>"
	+ "		<td>"
	+ "			剛体: "+ metadata.rigidBodyCount + "個"
	+ "			(<input type=\"checkbox\" onclick=\"togglePhysicsVisibility(" + id + ", this.checked);\" title=\"剛体を表示します。\">表示) / "
	+ "			関節: " + metadata.constraintCount + "個"
	+ "			<br>"
	+ "			<a href=\"javascript:void(initPhysics(" + id + "));\" title=\"剛体を初期化します。\">初期化</a>"
	+ "			または"
	+ "			<a href=\"javascript:void(changeRigidMode(" + id + ", 0));\" title=\"剛体を固着させます。\">固着</a>"
	+ "			/"
	+ "			<a href=\"javascript:void(changeRigidMode(" + id + ", 1));\" title=\"わからん。\">タコ1</a>"
	+ "			<a href=\"javascript:void(changeRigidMode(" + id + ", 2));\" title=\"ぜんぜんわからん。\">タコ2</a>"
	+ "		</td>"
	+ "	</tr>"
	+ "	<tr>"
	+ "		<th>骨</th>"
	+ "		<td>"
	+			metadata.boneCount + "本"
	+ "			(うち" + obj.geometry.userData.MMD.iks.length + "本がIKに関係します)"
	+ "			<a href=\"javascript:void(MMDScene.getObjectById(" + id + ").skeleton.pose());\" title=\"ポーズを初期化します。\">初期化</a>"
	+ "			<br>"
	+ "			IKを"
	+ "			<input type=\"checkbox\" onclick=\"toggleIKVisibility(" + id + ", this.checked);\" title=\"IKを表示します。\">表示"
	+ "			<input type=\"checkbox\" onclick=\"toggleIK(" + id + ", this.checked);\" title=\"IK演算を有効化します。\" checked>有効化"
	+ "		</td>"
	+ "	</tr>"
	+ "	<tr>"
	+ "		<th>設定</th>"
	+ "		<td>"
	+ "			<input type=\"checkbox\" onclick=\"MMDScene.getObjectById(" + id + ").receiveShadow = this.checked; MMDScene.getObjectById(" + id + ").castShadow = this.checked;\" title=\"このモデルに影を落とします。シーン設定より先にこちらを有効化してください。\">影"
	+ "			<input type=\"checkbox\" onclick=\"MMDScene.getObjectById(" + id + ").visible = this.checked;\" title=\"このモデルをレンダリングします。\" checked>表示"
	+ "			<input type=\"checkbox\" onclick=\"makePhongMaterials(" + id + ", !this.checked);\" title=\"トゥーンシェーディングを有効化します。\" checked>&#9888;Toon"
	+ "		</td>"
	+ "	</tr>"
	+ "	<tr>"
	+ "		<th>表情</th>"
	+ "		<td>"
	+ "			<input type=\"checkbox\" onclick=\"MorphManipulator" + id + ".hidden = !this.checked;\" title=\"モーフのウェイトをリアルタイムに表示・制御する制御盤を表示します。\" checked>"
	+ "			制御盤 (" + metadata.morphCount + "個あります)"
	+ "			<a href=\"javascript:void(initMorphInfluences(" + id + "));\" title=\"モーフを初期化します。\">初期化</a>"
	+ "			<br>"
	+ "			<input type=\"checkbox\" onclick=\"setIsMorphManipulatorAdaptive(" + id + ", this.checked);\" title=\"変化があったもののみ表示します。\">"
	+ "			制御盤の適応表示"
	+ "			<table id=\"MorphManipulator" + id + "\">" //テーブルネスト許して
	+ 				createMorphManipulator(id)
	+ "			</table>"
	+ "		</td>"
	+ "	</tr>"
	+ "	<tr>"
	+ "		<th>位置</th>"
	+ "		<td>"
	+ "			X: <input type=\"number\" step=\"0.1\" oninput=\"MMDScene.getObjectById(" + id + ").position.x = Number(this.value);\" value=\"0\"><br>"
	+ "			Y: <input type=\"number\" step=\"0.1\" oninput=\"MMDScene.getObjectById(" + id + ").position.y = Number(this.value);\" value=\"0\"><br>"
	+ "			Z: <input type=\"number\" step=\"0.1\" oninput=\"MMDScene.getObjectById(" + id + ").position.z = Number(this.value);\" value=\"0\"><br>"
	+ "		</td>"
	+ "	</tr>"
	+ "	<tr>"
	+ "		<th>角度</th>"
	+ "		<td>"
	+ "			X: <input type=\"number\" step=\"0.01\" oninput=\"MMDScene.getObjectById(" + id + ").rotation.x = Number(this.value);\" value=\"0\"><br>"
	+ "			Y: <input type=\"number\" step=\"0.01\" oninput=\"MMDScene.getObjectById(" + id + ").rotation.y = Number(this.value);\" value=\"0\"><br>"
	+ "			Z: <input type=\"number\" step=\"0.01\" oninput=\"MMDScene.getObjectById(" + id + ").rotation.z = Number(this.value);\" value=\"0\"><br>"
	+ "		</td>"
	+ "	</tr>"
	+ "	<tr>"
	+ "		<th>拡縮</th>"
	+ "		<td>"
	+ "			X: <input type=\"number\" step=\"0.1\" oninput=\"MMDScene.getObjectById(" + id + ").scale.x = Number(this.value);\" value=\"1\"><br>"
	+ "			Y: <input type=\"number\" step=\"0.1\" oninput=\"MMDScene.getObjectById(" + id + ").scale.y = Number(this.value);\" value=\"1\"><br>"
	+ "			Z: <input type=\"number\" step=\"0.1\" oninput=\"MMDScene.getObjectById(" + id + ").scale.z = Number(this.value);\" value=\"1\"><br>"
	+ "		</td>"
	+ "	</tr>"
	+ "</table>"
	
	+ "</div>";
	
	console.log("作成した各制御盤をメインの制御盤に挿入しています...");
	ModelManipulator.insertAdjacentHTML('beforeend', temp);
}
