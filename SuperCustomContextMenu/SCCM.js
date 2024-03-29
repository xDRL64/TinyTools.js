let SuperCustomContextMenu = {}; // API Receiver

((SCCM)=>{ // API Exporter


	let core = {};

	core.theme_key = Symbol("THEME PRIVATE MEMORY");


	//core.atNextLoop = (callback,time)=>setTimeout(callback,time??1); // use time arg in debug case
	// setTimeout TOOOOOOOOOOOOO MUCH RANDOM !

	core.atNextLoop = function(callback){ // for slow host machine or for firefox
		requestAnimationFrame( (()=>requestAnimationFrame(callback)) );
	};

	/* core.atNextLoop = function(callback){
		requestAnimationFrame( callback );
	}; */



	// MAKES PUBLIC PROPERTY (via public getter)
	SCCM.providing ??= {};
	SCCM.providing.get_theme_key = ()=>core.theme_key; 

	core.themeLib = (()=>{

		// MUST HAVE AT LEAST ALL TYPES (_all/root/layer/menu/item/behaviors) EVENT IF ARE EMPTY
		const sccm_NULL = {
			_all  : {style:{},class:[],css:''},
			root  : {style:{},class:[],css:''},
			layer : {style:{},class:[],css:''},
			menu  : {style:{},class:[],css:''},
			item  : {style:{},class:[],css:''},
			behaviors : {},
		};

		const _mix_base = (full_base, part_base)=>{
			// accepts : _all/root/layer/menu/item/behaviors
			const new_base = {};
			['_all', 'root', 'layer', 'menu', 'item'].forEach(prop=>{
				new_base[prop] = {
					style : {...full_base[prop].style, ...(part_base[prop]?.style||{})},
					class : [...full_base[prop].class, ...(part_base[prop]?.class||[])],
					css   : full_base[prop].css + (part_base[prop]?.css||''),
				};
			});
			
			new_base.behaviors = {...full_base.behaviors, ...(part_base.behaviors||{})};

			return new_base;
		};

		const mix_base = (base, ...parts)=>{
			return parts.reduce( (a,c)=>_mix_base(a,c), base );
		};

		const stack_addonInit = (...inits)=>{
			const stack = {};
			['root', 'layer', 'menu', 'item'].forEach(prop=>{
				stack[prop] = (elem, uKey)=>inits.forEach( init=>init[prop]?.(elem, uKey) );
			});
			return stack; // new addon init
		};

		const collect_css = (base, sccm, usr)=>{
			return (
				base._all.css        + base.root.css        + base.layer.css        + base.menu.css        + base.item.css +
			    (sccm._all.css||'')  + (sccm.root.css||'')  + (sccm.layer.css||'')  + (sccm.menu.css||'')  + (sccm.item.css||'') +
			    (usr?._all?.css||'') + (usr?.root?.css||'') + (usr?.layer?.css||'') + (usr?.menu?.css||'') + (usr?.item?.css||'')
			);
		};

		const mix_style = (type, base, sccm, usr)=>{
			return {
				// _all                    // (root/layer/menu/item)
				...(base._all.style),      ...(base[type].style),       // base
				...(sccm._all.style||{}),  ...(sccm[type].style||{}),   // sccm
				...(usr?._all?.style||{}), ...(usr?.[type]?.style||{}), // usr
			};
			// priority : { ...base._all, ...base.type, ...sccm._all, ...sccm.type, ...usr._all, ...usr.type }
		};

		const merge_class = (type, base, sccm, usr)=>{
			return [...new Set([
				// _all                    // (root/layer/menu/item)
				...(base._all.class),      ...(base[type].class),       // base
				...(sccm._all.class||[]),  ...(sccm[type].class||[]),   // sccm
				...(usr?._all?.class||[]), ...(usr?.[type]?.class||[]), // usr
			])].join(' ');
			// priority : { ...base._all, ...base.type, ...sccm._all, ...sccm.type, ...usr._all, ...usr.type }
		};

		const compile_init = (base, sccm, usr)=>{
			const init = {root:null, layer:null, menu:null, item:null};
			for(const type in init) init[type] = {
				style : mix_style(type, base, sccm, usr),
				class : merge_class(type, base, sccm, usr),
			}
			return init;
		};

		const apply_init = (dst_elem, src_init)=>{
			// apply style
			const dst = dst_elem.style;
			const src = src_init.style;
			for(const prop in src) dst[prop] = src[prop];
			// apply class
			//dst_elem.className = src_init.class; // removes previous className
			dst_elem.className = [...new Set( // preserve previous className
				(dst_elem.className+' '+src_init.class).split(' ')
			)].join(' ');
		};

		const build_init = (base, sccm, usr, {addon_init, usrKey})=>{
			const inits = compile_init(base, sccm, usr);
			return {
				root(elem) { apply_init(elem, inits.root);  addon_init?.root?.(elem, usrKey); },
				layer(elem){ apply_init(elem, inits.layer); addon_init?.layer?.(elem, usrKey); },
				menu(elem) { apply_init(elem, inits.menu);  addon_init?.menu?.(elem, usrKey); },
				item(elem) { apply_init(elem, inits.item);  addon_init?.item?.(elem, usrKey); },
			};
		};

		const bind_behavior = (binders, uKey)=>{
			const binded = {};
			for(const behavior in binders)
				binded[behavior] = binders[behavior](uKey);

			return binded;
		};

		const mix_behavior = (base, sccm, usr, uKey)=>{
			return {
				...bind_behavior(base.behaviors, uKey),
				...bind_behavior(sccm.behaviors, uKey),
				...(usr?.behavior||{}),
			};
		};

		const make_themeGenerator = (base, sccm, addon_init)=>{
			const theme = {};

			theme.css = null;
			theme.init = null;
			theme.behavior = null;
			theme.uKey = null;
	
			theme.set = (usrKey, usrTheme)=>{
				if(!usrKey) return;
				theme.uKey = usrKey;
				// css collecting
				theme.css = collect_css(base, sccm, usrTheme);
				// style mixing / class merging
				theme.init = build_init(base, sccm, usrTheme, {addon_init, usrKey});
				// behavior binding and mixing
				theme.behavior = mix_behavior(base, sccm, usrTheme, usrKey);
			};
	
			theme.get = (specifyElem)=>{
				if(specifyElem === 'separator')
					return { // usefull in item seprator case
						init : theme.init.item,
					};
				if(specifyElem === 'handle')
					return { // usefull to autoconfigure handle (out of template / after menu building process)
						init : theme.init.root,
					};
				if(specifyElem)
					return { // usefull in main menu settings case (for example)
						init      : theme.init[specifyElem],
						behavior  : theme.behavior,
						layerInit : (specifyElem==='menu') ? theme.init['layer'] : null,
					};
				else
					return { // usefull in template's general settings
						css      : theme.css,
						initELEM : theme.init,
						behavior : theme.behavior,
					};
			};

			return theme;
		};

		return {sccm_NULL, mix_base, stack_addonInit, make_themeGenerator};
	})();

	core.theme = (()=>{

		const TMEM = core.theme_key;

		const {sccm_NULL, mix_base, stack_addonInit, make_themeGenerator} = core.themeLib;

		// later available entities (use as "wrapper" by calling this : example__()() )
		const stdCheckOverflow__ = ()=>core.preventOverflowLib.run_stdPresetProcess; // later (lib) function available
		const get_currentWindowRect__ = ()=>get_currentWindowRect; // later (scope) function available

		// AAA

		// base debug : css mixing
		const cssMixingDebug_base_A = {
			_all  : {css:'base_A : _all\n'},
			root  : {css:'base_A : root\n'},
			layer : {css:'base_A : layer\n'},
			menu  : {css:'base_A : menu\n'},
			item  : {css:'base_A : item\n'},
		};
		const cssMixingDebug_part_A = {
			_all  : {css:'part_A : _all\n'},
			root  : {css:'part_A : root\n'},
			layer : {css:'part_A : layer\n'},
			menu  : {css:'part_A : menu\n'},
			item  : {css:'part_A : item\n'},
		};
		const cssMixingDebug_A = mix_base(sccm_NULL, cssMixingDebug_base_A, cssMixingDebug_part_A);
		const cssMixingDebug_base_B = {
			_all  : {css:'base_B : _all\n'},
			root  : {css:'base_B : root\n'},
			layer : {css:'base_B : layer\n'},
			menu  : {css:'base_B : menu\n'},
			item  : {css:'base_B : item\n'},
		};
		const cssMixingDebug_part_B = {
			_all  : {css:'part_B : _all\n'},
			root  : {css:'part_B : root\n'},
			layer : {css:'part_B : layer\n'},
			menu  : {css:'part_B : menu\n'},
			item  : {css:'part_B : item\n'},
		};
		const cssMixingDebug_B = mix_base(sccm_NULL, cssMixingDebug_base_B, cssMixingDebug_part_B);

		/* make_themeGenerator(cssMixingDebug_A, cssMixingDebug_B)
		RESULT :
		-------------
		base_A : _all
		part_A : _all
		base_A : root
		part_A : root
		base_A : layer
		part_A : layer
		base_A : menu
		part_A : menu
		base_A : item
		part_A : item
		base_B : _all
		part_B : _all
		base_B : root
		part_B : root
		base_B : layer
		part_B : layer
		base_B : menu
		part_B : menu
		base_B : item
		part_B : item
		*/



		// GLOBAL THEME TEMP
		let padding, border, total, time;


		// TODO segment behavior in _behav

		// THEME TEMPLATE BASES
		//

		
		// base and baseMain

		const _base = { // minimal base :: +[style.prtEvt/display]
			// MUST HAVE ALL TREE PROPS EVENT IF ARE EMPTY
			_all : {
				style : {},
				class : [],
				css : '',
			},
			root : {
				style : {
					position : 'relative',
					userSelect : 'none',
					pointerEvents : 'none',
				},
				class : [/*StringArray*/],
				css : '',
			},
			layer : {
				style : {
					width : 0,
					height : 0,
					position : 'absolute',
					//pointerEvents : 'none',
				},
				class : [/*StringArray*/],
				css : '',
			},
			menu : {
				style : {
					//pointerEvents : 'none',
					position : 'absolute',
					display : 'grid',
				},
				class : [/*StringArray*/],
				css : '',
			},
			item : {
				style : {
					position : 'relative',
				},
				class : [/*StringArray*/],
				css : '',
			},
			
		};

		const _behav = { // minimal behavior :: *[behav.all]
			behaviors : {
				// binders
				//
				openMenu_method : (uKey)=>{
					return (menu)=>{
						menu.style.display = '';
						menu.style.pointerEvents = 'auto';
						menu[uKey].elems.update_itemRects();
					};
				},
				closeMenu_method : (uKey)=>{
					return (menu)=>{
						menu.style.display = 'none';
						menu.style.pointerEvents = 'none';
					};
				},
				setClosedMenu_method : (uKey)=>{
					return (menu)=>{
						menu.style.display = 'none';
						menu.style.pointerEvents = 'none';
					};
				},
				hoverItem_method : (uKey)=>{
					return (item)=>{
					};
				},
				leaveItem_method : (uKey)=>{
					return (item)=>{
					};
				},
				inpathItem_method : (uKey)=>{
					return (item)=>{
					};
				},
				outpathItem_method : (uKey)=>{
					return (item)=>{
					};
				},
				disableItem_method : (uKey)=>{
					return (item)=>{
					};
				},
				enableItem_method : (uKey)=>{
					return (item)=>{
					};
				},
				replaceLayer_method : (uKey)=>{
					return ({hook, root, upMenu, item, layer, menu})=>{
						const rootRect = root[uKey].get_rect();
						const elemRect = item[uKey].get_rect();
						layer.style.left = elemRect.x - rootRect.x + 'px';
						layer.style.top  = elemRect.y - rootRect.y + 'px';
						layer.style.width  = elemRect.w + 'px';
						layer.style.height = elemRect.h + 'px';
			
					};
				},
			},
		};

		const _behavMain = { // baseMain settings :: *[behav.replace]
			// contains only differences from its base
			behaviors : {
				replaceLayer_method : (uKey)=>{
					return ({hook, root, upMenu, item, layer, menu})=>{
						menu[uKey].update_rect();
						const elemRect = menu[uKey].get_rect();
						layer.style.left = '';
						layer.style.top  = '';
						layer.style.width  = elemRect.w + 'px';
						layer.style.height = elemRect.h + 'px';
			
					};
				},
			},
		};

		const _cssvar = (sympetricPadding, symetricBorder, totalOffset, transitionTime)=>({
			// args : css expression/value (accepts units and functions)
			// MUST HAVE AT LEAST ALL TYPES (_all/root/layer/menu/item/behaviors) EVENT IF ARE EMPTY
			_all  : {
				
			},
			root  : {
				class : ['sccmRoot'],
				css : '\n'
				    + '/* _cssvar (_all) */\n'
				    + '.sccmRoot{'
				    + `  --padding : ${sympetricPadding||'0px'};`
					+ `  --border : ${symetricBorder||'0px'};`
					+ `  --posOfst : ${totalOffset||'0px'};`
					+ `  --negOfst : calc(${totalOffset||'0px'} * -1);`
					+ `  --animTime : ${transitionTime||'0s'};`
				    + '}\n'
			},
			layer : {},
			menu  : {},
			item  : {},
			behaviors : {},
		});

		// class

		const classNames = {
			itemSeparator : 'asSeparator',
			// TODO defines the rest
			GENERAL      : 'general',
			HORIZONTAL   : 'horizontal',
			MAIN         : 'main',
			SUBMAIN      : 'submain',
			MENU         : 'menu',
			ITEM         : 'item',
			CLOSED       : 'closed',
			HOVERED      : 'hovered',
			INPATH       : 'inPath',
			NOTAVAILABLE : 'notAvailable',
			SEPARATOR    : 'asSeparator',
			LOCKED       : 'locked',
			//
			OPEN         : 'open',
		};

		const class_base = ()=>{ // class settings :: +[class.menu/item]
			const {MENU, ITEM} = classNames;
			return {
				// contains only differences from its base
				menu : {
					class : [MENU],
				},
				item : {
					class : [ITEM],
				},
			};
		};
		const class_behav = ()=>{ // class settings :: *[behav.all-replace]
			const {CLOSED, HOVERED, INPATH, NOTAVAILABLE} = classNames;
			return {
				// contains only differences from its base
				behaviors : {
					// binders
					//
					openMenu_method : (uKey)=>{
						return (menu)=>{
							menu.classList.remove(CLOSED);
							menu[uKey].elems.update_itemRects();
						};
					},
					closeMenu_method : (uKey)=>{
						return (menu)=>{
							menu.classList.add(CLOSED);
						};
					},
					setClosedMenu_method : (uKey)=>{
						return (menu)=>{
							menu.classList.add(CLOSED);
						};
					},
					hoverItem_method : (uKey)=>{
						return (item)=>{
							item.classList.add(HOVERED);
						};
					},
					leaveItem_method : (uKey)=>{
						return (item)=>{
							item.classList.remove(HOVERED);
						};
					},
					inpathItem_method : (uKey)=>{
						return (item)=>{
							item.classList.add(INPATH);
						};
					},
					outpathItem_method : (uKey)=>{
						return (item)=>{
							item.classList.remove(INPATH);
						};
					},
					disableItem_method : (uKey)=>{
						return (item)=>{
							item.classList.add(NOTAVAILABLE);
						};
					},
					enableItem_method : (uKey)=>{
						return (item)=>{
							item.classList.remove(NOTAVAILABLE);
						};
					},
	
					// replaceLayer_method // not overwrote
				},
			};
		};

		const class_ptrLogic_part = ()=>{ // class use prtEvt :: +[css.menu.auto/css.closed.none]
			const {MENU, CLOSED, LOCKED} = classNames;
			return {
				// contains only differences from its base
				menu : {
					css : '\n'
						+ '/* class_ptrLogic_part */\n'
						+ `.${MENU}{`
						+ '  pointer-events : auto;'
						+ '}\n'
						+ `.${CLOSED}{`
						+ '  pointer-events : none;'
						+ '}\n'
						+ `.${LOCKED}{`
						+ '  pointer-events : none;'
						+ '}\n',
				},
			};
		};

		const class_displayLogic_part = ()=>{ // class use opacity :: +[css.menu.opa:1/css.menu.clo.opa:0]
			const {MENU, CLOSED} = classNames;
			return {
				// contains only differences from its base
				menu : {
					css : '\n'
						+ '/* class_displayLogic_part */\n'
						+ `.${MENU}{`
						+ '  opacity : 1;'
						+ '}\n'
						+ `.${CLOSED}{`
						+ '  opacity : 0;'
						+ '}\n',
				},
			};
		};

		const class_sizeFitContent_part = ()=>{ // ::
			const {MENU} = classNames;
			return {
				// contains only differences from its base
				menu : {
					css : '\n'
						+ '/* class_sizeFitContent_part */\n'
						+ `.${MENU}{`
						+ '  width: fit-content;'
						+ '  height: fit-content;'
						+ '}\n',
				},
			};
		};

		const expendClass_part = ()=>{ // add class open :: *[behav.open/close/setclose]
			const {CLOSED, OPEN} = classNames;
			return {
				// contains only differences from its base
				behaviors : {
					// binders
					//
					openMenu_method : (uKey)=>{
						return (menu)=>{
							menu.classList.add(OPEN);
							menu.classList.remove(CLOSED);
							menu[uKey].elems.update_itemRects();
						};
					},
					closeMenu_method : (uKey)=>{
						return (menu)=>{
							menu.classList.add(CLOSED);
							menu.classList.remove(OPEN);
						};
					},
					setClosedMenu_method : (uKey)=>{
						return (menu)=>{
							menu.classList.add(CLOSED);
							menu.classList.remove(OPEN);
						};
					},
	
				},
			};
		};

		// classMain

		const class_baseMain = ()=>{ // add class main :: +[class.menu.main]
			const {MAIN} = classNames;
			return {
				// contains only differences from its base
				menu : {
					class : [MAIN],
				},
			};
		};

		// class item separator
		const class_itemSeparator_part = ()=>{
			const {SEPARATOR} = classNames;
			return {
				// contains only differences from its base
				item : { // use on item
					class : [SEPARATOR],
				},
			};
		};

		// basic position

		const openRight_part = (offset='0px')=>{ // set submenu position :: +[style.menu.left:100%+offset]
			const {} = classNames;
			return {
				// contains only differences from its base
				menu : { // use in submenu case to unfold at right side
					style : {
						left : `calc(100% + ${offset})`,
					},
				},
			};
		};
		
		// basic position main

		const openRight_partMain = ()=>{ // set main menu position :: +[style.menu.left:'']
			const {} = classNames;
			return {
				// contains only differences from its base
				menu : { // use in main menu case to overwrite openRight_part
					style : {
						left : '', // TODO test with '0%' instead
					},
				},
			};
		};

		// advanced position [stdFold]

		const stdFold_behav = ()=>{
			const {CLOSED} = classNames;
			return {
				behaviors : {
					// binders
					//
					openMenu_method : (uKey)=>{
						return (menu)=>{
							menu.classList.remove(CLOSED);
							menu[TMEM].slidingExtra.overlapping_onmove();
							const offset = getComputedStyle(menu).getPropertyValue('--posOfst');
							stdFoldUsingClass_process(menu, uKey, offset);
							//if(menu[uKey].elems.is_main())
								menu[uKey].elems.update_itemRects();
						};
					},
					closeMenu_method : (uKey)=>{
						return (menu)=>{
							menu.classList.add(CLOSED);
							//menu.classList.remove('RIGHT', 'LEFT', 'DOWN', 'TOP', 'TOPWIN');
							menu[TMEM].slidingExtra.overlapping_onmove();
						};
					},
				},
			};
		};

		const stdFold_checkOnly = (menu, uKey, symetricOffset='0px')=>{  // :: // BBB
			// use it in an openMenu_method
			const ofst = parseInt(symetricOffset);
			const RL_result = stdCheckOverflow__()('RIGHTLEFT', true, menu, uKey, ofst);
			const DT_result = stdCheckOverflow__()('DOWNTOP', false, menu, uKey, ofst);

			return {RL_result, DT_result};
		};

		const stdFoldUsingClass_process = (menu, uKey, symetricOffset='0px')=>{  // :: left/top
			// use it in an openMenu_method
			menu.classList.remove('RIGHT', 'LEFT', 'DOWN', 'TOP', 'TOPWIN');

			//const {RL_result,DT_result} = stdFold_checkOnly(menu, uKey, symetricOffset);
			const {RL_result,DT_result} = stdFoldFollowLastSens_process(menu, uKey, symetricOffset);

			if(RL_result.status) menu.classList.add(RL_result.sideName);
			if(DT_result.status) menu.classList.add(DT_result.sideName);
			else // vertical fold fail : last resort placing (downscales and makes scrollable)
				stdFold_vrtLastResort(menu, uKey, DT_result, false);
			// TODO manage fail case (hrz set pos 0,0 window)
		};

		const stdFoldUsingClass_processWithTransition = (menu, uKey, symetricOffset='0px')=>{  // :: left/top
			// use it in an openMenu_method
			menu.classList.remove('RIGHT', 'LEFT', 'DOWN', 'TOP');
			const original_transition_value = menu.style.transition;
			menu.style.transition = '';
			const {RL_result,DT_result} = stdFold_checkOnly(menu, uKey, symetricOffset);
			menu.style.transition = original_transition_value;
			const _apply = ()=>{
				if(RL_result.status) menu.classList.add(RL_result.sideName);
				if(DT_result.status) menu.classList.add(DT_result.sideName);
				// TODO manage fail case (hrz set pos 0,0 window; vrt resize and make rollable)
				menu.classList.remove('closed'); // TODO find better way to do it
			};
			core.atNextLoop(_apply);
			// TODO add follow last sens sys
		};

		const stdFold_vrtLastResort = (menu, uKey, DT_result, startPosClass)=>{
			const {lastResort} = DT_result;
			const {status, sideName, cssVar} = lastResort;

			menu.style.setProperty(cssVar.name, cssVar.value);
			menu.classList.add(sideName);
			if(startPosClass) menu.classList.add('_'+sideName);

			if(!status){ // last resort is not enough : then downscaling process
				if(menu[TMEM].stdScroll){
					const frameHeight = menu[TMEM].stdFold_frameRect.get().h;
					menu[TMEM].stdScroll.rescale_height(frameHeight + -16 + 'px');
				}
			}
		};

		const stdFoldUsingClassStartPos_process = (menu, uKey, symetricOffset='0px')=>{
			// use it in an openMenu_method
			const isClosed = !menu[TMEM].stdFold_isTransition; // is totally closed
			const isMain = menu[uKey].elems.is_main();
			let mainPosChanged = false;

			if(isClosed || isMain) menu[TMEM].stdScroll?.reset_height();

			if(isMain){
				mainPosChanged = menu[TMEM].stdFold_mainPosTracking?.update();
				if(mainPosChanged) menu.classList.remove('_RIGHT', '_LEFT', '_DOWN', '_TOP', '_TOPWIN');
			}

			const {RL_result,DT_result} = stdFoldFollowLastSens_process(menu, uKey, symetricOffset);

			const _apply = ()=>{
				menu.style.transition = '';
				if(RL_result.status) menu.classList.add(RL_result.sideName);
				if(DT_result.status) menu.classList.add(DT_result.sideName);
			};

			if(isClosed || isMain && mainPosChanged)
				menu.style.transition = menu[TMEM].stdFold_startPosLock;

			if(isClosed || isMain){
				if(RL_result.status) menu.classList.add('_'+RL_result.sideName);
				else{} // TODO manage fail case (hrz set pos 0,0 window)
				if(DT_result.status) menu.classList.add('_'+DT_result.sideName);
				else // vertical fold fail : last resort placing (downscales and makes scrollable)
					stdFold_vrtLastResort(menu, uKey, DT_result, true);
				
				core.atNextLoop(_apply);
				
			}else{
				_apply();
			}

		};

		// advanced position [stdFold follow last sens]

		const stdFoldFollowLastSens_process = (menu, uKey, symetricOffset='0px')=>{
			stdFoldFollowLastSens_processSet(menu, uKey);
			const {RL_result,DT_result} = stdFold_checkOnly(menu, uKey, symetricOffset);
			stdFoldFollowLastSens_processGet(menu, uKey, RL_result);
			return {RL_result,DT_result};
		};
		
		const stdFoldFollowLastSens_processSet = (menu, uKey)=>{
			// submenu cases
			if(menu[uKey].elems.is_sub()){
				const upMenu = menu[uKey].elems.get_upMenu();
				const main = menu[uKey].elems.get_main();
				if(upMenu[TMEM]?.stdFold_followLastSens){ // process (set reverse)
					const current = upMenu[TMEM].stdFold_followLastSens.current;
					const defsens = main[TMEM].stdFold_followLastSens.defaultSens;
					menu[TMEM].stdFold_followLastSens.reverseSens = (current !== defsens);
				}
			}
		};

		const stdFoldFollowLastSens_processGet = (menu, uKey, hrzRes)=>{
			// main menu case
			if(menu[uKey].elems.is_main())
			if(menu[TMEM].stdFold_followLastSens) // init
				menu[TMEM].stdFold_followLastSens.defaultSens = hrzRes.defaultSide;
			// all cases (main and submenu)
			if(hrzRes.status) menu[TMEM].stdFold_followLastSens.current = hrzRes.sideName;
		};
		
		const class_stdFold_part = ()=>{
			const {MAIN} = classNames;
			return {
				// contains only differences from its base

				// use to overwrite [class_slidingStartPos_part / class_slidingStartPosMain_part]
				// left/top % relative to parent (layer) // translate % relative to menu itself
				menu : {
					css : '\n'
						+ '/* class_stdFold_part */\n'
	
						// main by axes
						+ `.${MAIN}.RIGHT{` // main menu (RL)
						+ `  left : 0%;`
						+ '}\n'
						+ `.${MAIN}.LEFT{`
						+ `  right : 100%;`
						+ '}\n'
	
						+ `.${MAIN}.DOWN{` // main menu (DT)
						+ `  top : 0%;`
						+ '}\n'
						+ `.${MAIN}.TOP{`
						+ `  bottom : 100%;`
						+ '}\n'
	
						// submenu by axes
						+ '.RIGHT{' // submenu (RL)
						+ `  left : calc(100% + var(--posOfst));`
						+ '}\n'
						+ '.LEFT{'
						+ `  right : calc(100% + var(--posOfst));`
						+ '}\n'
	
						+ '.DOWN{' // submenu (DT)
						+ `  top : var(--negOfst);`
						+ '}\n'
						+ '.TOP{'
						+ `  bottom : var(--negOfst);`
						+ '}\n'
	
						+ '.TOPWIN{'
						+ `  top : var(--topwinOfst);`
						+ '}\n',
				},
			};
		};
		const class_stdFoldClose_part = ()=>{ // left/top % relative to parent (layer) // translate % relative to menu itself
			const {MENU, CLOSED} = classNames;
			return {
				// contains only differences from its base
				menu : {
					css : '\n'
						+ '/* class_stdFoldClose_part */\n'
						+ `.${MENU}.${CLOSED}{` // all menu
						+ `  left : 0%;`
						+ `  top : 0%;`
						//+ `  translate : 0% 0%;`
						+ '}\n',
				},
			};
		};

		const class_stdFoldFollowLastSens_additional_inits = ()=>{
			return {
				menu : (menu, uKey)=>{
					menu[TMEM] ||= {};
					menu[TMEM].stdFold_followLastSens = {};
				},
			};
		};

		const stdFold_windowAsFrameRect_additional_inits = ()=>{
			const get_frameRect__ = get_currentWindowRect__;
			return {
				menu : (menu, uKey)=>{
					menu[TMEM] ||= {};
					menu[TMEM].stdFold_frameRect = {};
					menu[TMEM].stdFold_frameRect.get = ()=>get_frameRect__()();
				},
			};
		};

		// overlapping z-index depth positioning

		const overlapInterlacing_additional_inits = ()=>{
			return {
				// does not affect brother menus.
				// z-index [opening/closing] and [open] patern, see :
				// for(let i=0; i<10; i++) console.log('opening/closing : '+(3 + (i-1)*2 - 1)+'\n'+'open : '+(3 + (i)*2));
				// orders from main to submenu chain as bg to fg.
				// allows interlacing without falling under zero. (zIndex<0 locks ptr event)
				menu : (menu, uKey)=>{
					menu[TMEM] ||= {};
					menu[TMEM].slidingExtra = {
						overlapping_onmove : ()=>{
							const depth = menu[uKey].elems.get_depth();
							menu[uKey].elems.get_layer().style.zIndex = 3 + (depth-1)*2 - 1;
						},
						overlapping_stable : ()=>{
							const depth = menu[uKey].elems.get_depth();
							menu[uKey].elems.get_layer().style.zIndex = 3 + depth*2;
						},
					};
				},
			};
		};

		const overlapInvertDepth_additional_inits = ()=>{
			return {
				// uses 2 levels of z-index by menu chain depth.
				// opening menu z-index : its depth * 2
				// all its brothers z-index : (its depth * 2) - 1
				// orders from main to submenu chain as fg to bg.
				// allows z-index logic without falling under zero. (zIndex<0 locks ptr event)
				menu : (menu, uKey)=>{
					const overlapping_method = ()=>{
						const depth = menu[uKey].elems.get_depth();
						const max = menu[uKey].elems.get_maxDepth();
						const final = (max - depth) * 2;
						menu[uKey].elems.get_upMenu()?.[uKey].elems.get_items().forEach(
							item=>{
								const submenu = item[uKey].elems.get_submenu();
								if(submenu) submenu[uKey].elems.get_layer().style.zIndex = final - 1;
							}
						);
						menu[uKey].elems.get_layer().style.zIndex = final;
					};
	
					menu[TMEM] ||= {};
					menu[TMEM].slidingExtra = {
						overlapping_onmove : overlapping_method,
						overlapping_stable : overlapping_method,
					};
	
				},
			};
		};


		// sliding effect

		const class_slidingStartPos_part = ()=>{
			const {MAIN} = classNames;
			return {
				// contains only differences from its base

				// do not use as alone
				// left/top % relative to parent (layer) // translate % relative to menu itself
				menu : {
					css : '\n'
						+ '/* class_slidingStartPos_part */\n'
	
						// main by axes
						+ `.${MAIN}._RIGHT{` // main menu (RL)
						+ `  left : 0%;`
						+ '}\n'
						+ `.${MAIN}._LEFT{`
						+ `  right : 100%;`
						+ '}\n'
	
						+ `.${MAIN}._DOWN{` // main menu (DT)
						+ `  top : 0%;`
						+ '}\n'
						+ `.${MAIN}._TOP{`
						+ `  bottom : 100%;`
						+ '}\n'
	
						// submenu by axes
						+ '._RIGHT{' // submenu (RL)
						+ `  left : calc(0% + var(--negOfst));`
						+ '}\n'
						+ '._LEFT{'
						+ `  right : calc(0% + var(--negOfst));`
						+ '}\n'
	
						+ '._DOWN{' // submenu (DT)
						+ `  top : var(--negOfst);`
						+ '}\n'
						+ '._TOP{'
						+ `  bottom : var(--negOfst);`
						+ '}\n'
	
						+ '._TOPWIN{'
						+ `  top : var(--topwinOfst);`
						+ '}\n',
				},
			};
		};

		const sliding_behav = ()=>{ // SCCM sliding style
			const {CLOSED} = classNames;
			return {
				// contains only differences from its base
				behaviors : {
					// binders
					//
					openMenu_method : (uKey)=>{
						return (menu)=>{
							menu.classList.remove(CLOSED);
							menu[TMEM].slidingExtra.overlapping_onmove();
							const offset = getComputedStyle(menu).getPropertyValue('--posOfst');
							stdFoldUsingClassStartPos_process(menu, uKey, offset);
							if(menu[uKey].elems.is_main()) menu[uKey].elems.update_itemRects();
						};
					},
					closeMenu_method : (uKey)=>{
						return (menu)=>{
							menu.classList.add(CLOSED);
							menu.classList.remove('RIGHT', 'LEFT', 'DOWN', 'TOP', 'TOPWIN');
							menu[TMEM].slidingExtra.overlapping_onmove();
						};
					},
				},
			};
		};

		const sliding_additional_inits = ()=>{
			const {CLOSED, LOCKED} = classNames;
			return {
				// everything optional (root/layer/menu/item)
				menu : (menu, uKey)=>{
	
					const check_transitionProps = (menu,evt)=>{
						const propList = menu[TMEM].stdFold_transitionProps;
						if(menu === evt.composedPath().shift())
						if(propList.includes(evt.propertyName))
							return true;
						return false;
					};
	
					menu.addEventListener('transitionstart',e=>{
						if(check_transitionProps(menu,e)){
							menu[TMEM].stdFold_transitionUpdate(e.propertyName, true);
							if(menu.classList.contains(CLOSED)){
							}else{
								menu.classList.add(LOCKED);
							}
						}
					});
	
					menu.addEventListener('transitionend',e=>{
						if(check_transitionProps(menu,e)){
							menu[TMEM].stdFold_transitionUpdate(e.propertyName, false);
							if(menu.classList.contains(CLOSED)){
								if(!menu[TMEM].stdFold_isTransition)
									menu.classList.remove('_RIGHT', '_LEFT', '_DOWN', '_TOP', '_TOPWIN');
							}else{
								menu[uKey].elems.update_itemRects();
	
								menu[TMEM].slidingExtra.overlapping_stable();
	
								menu.classList.remove(LOCKED);
							}
						}
					});
	
				},
			};
		};

		// sliding submenus (optional)

		const slidingFollowMove_additional_inits = ()=>{ // submenus follow upmenu moves
			return {
				// everything optional (root/layer/menu/item)
				menu : (menu, uKey)=>{
	
					const check_transitionProps = (menu,evt)=>{
						const propList = ['left','right'];
						if(menu === evt.composedPath().shift())
						if(propList.includes(evt.propertyName))
							return true;
						return false;
					};
	
					const followMove = ()=>{
						if(menu[uKey].elems.is_sub()){
							menu[uKey].elems.get_upItem()[uKey].update_rect();
							menu[uKey].elems.update_layerPos();
							if(menu[TMEM].stdFold_isTransition) requestAnimationFrame( followMove );
						}
					};
	
					menu.addEventListener('transitionstart',e=>{
						if(check_transitionProps(menu,e)){
							followMove();
						}
					});
				},
			};
		};

		// sliding main menu (optionals)

		const class_slidingStartPosMain_part = ()=>{
			const {MAIN} = classNames;
			return {
				// contains only differences from its base

				// do not use as alone
				// use to overwrite [class_slidingStartPos_part]
				// left/top % relative to parent (layer) // translate % relative to menu itself
				menu : {
					css : '\n'
						+ '/* class_slidingStartPosMain_part */\n'
	
						// main by axes
						+ `.${MAIN}._RIGHT{` // main menu (RL)
						+ `  left : -100%;`
						+ '}\n'
						+ `.${MAIN}._LEFT{`
						+ `  right : 0%;`
						+ '}\n'
	
						+ `.${MAIN}._DOWN{` // main menu (DT)
						+ `  top : 0%;`
						+ '}\n'
						+ `.${MAIN}._TOP{`
						+ `  bottom : 100%;`
						+ '}\n',
				},
			};
		};

		const class_slidingStartPosMain_additional_inits = ()=>{
			return {
				menu : (menu, uKey)=>{
	
					const posTracker = {
						hasChanged : undefined, // will be 'true' at first time
						lastPosStr : '',
						update(){
							const rect = menu[uKey].elems.get_layer()[uKey].update_rect().get_rect();
							const newPosStr = '' + rect.x + rect.y;
							this.hasChanged = (this.lastPosStr !== newPosStr)
							this.lastPosStr = newPosStr;
							return this.hasChanged;
						},
					};
	
					menu[TMEM] ||= {};
					menu[TMEM].stdFold_mainPosTracking = {};
					menu[TMEM].stdFold_mainPosTracking.has_changed = ()=>posTracker.hasChanged;
					menu[TMEM].stdFold_mainPosTracking.update = ()=>posTracker.update();
				},
			};
		};

		const class_slidingNotLockMain_part = ()=>{ // does not lock ptrEvt on opening (main menu only)
			const {MAIN, LOCKED} = classNames;
			return {
				// contains only differences from its base
				menu : {
					css : '\n'
						+ '/* class_slidingNotLockMain_part */\n'
						+ `.${MAIN}.${LOCKED}{`
						+ '  pointer-events : auto;'
						+ '}\n',
				},
			};
		};

		const class_slidingNotLockOpen_part = ()=>{ // does not lock ptrEvt on opening (all menus)
			const {MENU, LOCKED} = classNames;
			return {
				// contains only differences from its base
				menu : {
					css : '\n'
						+ '/* class_slidingNotLockOpen_part */\n'
						+ `.${MENU}.${LOCKED}{`
						+ '  pointer-events : auto;'
						+ '}\n',
				},
			};
		};


		// fading effect

		const classFading_standard_part = (time='var(--animTime)')=>{
			const {MENU, CLOSED} = classNames;
			return {
				// contains only differences from its base
				menu : {
					css : '\n'
						+ '/* classFading_standard_part */\n'
						+ `.${MENU}{`
						+ '  opacity : 1;'
						+ `  transition : opacity ${time};`
						+ '}\n'
						+ `.${CLOSED}{`
						+ '  opacity : 0;'
						+ '}\n',
				},
			};
		};

		const classFading_itemBackdrop_part = (time='var(--animTime)')=>{
			const {MENU, ITEM, CLOSED} = classNames;
			return {
				// contains only differences from its base
				menu : {
					css : '\n'
						+ '/* classFading_itemBackdrop_part (menu) */\n'
						+ `.${MENU}{`
						+ `  transition : background-color ${time};`
						+ '}\n'
						+ `.${MENU}.${CLOSED}{` // closed menus
						+ '  background-color : #00000000;'
						+ '}\n',
				},
				item : {
					css : '\n'
						+ '/* classFading_itemBackdrop_part (item) */\n'
						+ `.${ITEM}{`
						+ '  opacity : 1;'
						+ `  transition : opacity ${time};`
						+ '}\n'
						+ `.${CLOSED} .${ITEM}{` // items in a closed menu // TODO : maybe use '>' instead ' ' selector constraint
						+ '  opacity : 0;'
						+ '}\n',
				},
			};
		};





		// merge effect

		const onlySliding_additional_inits = (time='var(--animTime)')=>{
			return {
				menu : (menu, uKey)=>{
					menu[TMEM] ||= {};
					menu[TMEM].stdFold_transitionProps = ['left','right'];
					menu[TMEM].stdFold_startPosLock = 'none'; // remove transition that affect position
					menu[TMEM].stdFold_transitionings = {'left':false,'right':false};
					menu[TMEM].stdFold_isTransition = false;
					menu[TMEM].stdFold_transitionUpdate = function(propName, transitioning){
						this.stdFold_transitionings[propName] = transitioning;
						this.stdFold_isTransition = Object.values(this.stdFold_transitionings).some(e=>e);
					};
				},
			};
		};

		const merge_stdFadingWithSliding = (time='var(--animTime)')=>{
			const {MENU} = classNames;
			return {
				// contains only differences from its base
				menu : {
					css : '\n'
					+ '/* merge_stdFadingWithSliding */\n'
					+ `.${MENU}{`
					+ `  transition : opacity ${time}, left ${time}, right ${time};`
					+ '}\n',
				},
			};
		};

		const stdFadingWithSliding_additional_inits = (time='var(--animTime)')=>{
			return {
				menu : (menu, uKey)=>{
					menu[TMEM] ||= {};
					menu[TMEM].stdFold_transitionProps = ['left','right','opacity'];
					menu[TMEM].stdFold_startPosLock = `opacity ${time}`; // remove transition that affect position
					menu[TMEM].stdFold_transitionings = {'left':false,'right':false,'opacity':false};
					menu[TMEM].stdFold_isTransition = false;
					menu[TMEM].stdFold_transitionUpdate = function(propName, transitioning){
						this.stdFold_transitionings[propName] = transitioning;
						this.stdFold_isTransition = Object.values(this.stdFold_transitionings).some(e=>e);
					};
				},
			};
		};

		const merge_itmbdropFadingWithSliding = (time='var(--animTime)')=>{
			const {MENU} = classNames;
			return {
				// contains only differences from its base
				menu : {
					css : '\n'
					+ '/* merge_itmbdropFadingWithSliding */\n'
					+ `.${MENU}{`
					+ `  transition : background-color ${time}, left ${time}, right ${time};`
					+ '}\n',
				},
			};
		};

		const itmbdropFadingWithSliding_additional_inits = (time='var(--animTime)')=>{
			return {
				menu : (menu, uKey)=>{
					menu[TMEM] ||= {};
					menu[TMEM].stdFold_transitionProps = ['left','right','background-color'];
					menu[TMEM].stdFold_startPosLock = `background-color ${time}`; // remove transition that affect position
					menu[TMEM].stdFold_transitionings = {'left':false,'right':false,'background-color':false};
					menu[TMEM].stdFold_isTransition = false;
					menu[TMEM].stdFold_transitionUpdate = function(propName, transitioning){
						this.stdFold_transitionings[propName] = transitioning;
						this.stdFold_isTransition = Object.values(this.stdFold_transitionings).some(e=>e);
					};
				},
			};
		};


		// AAA

		// rescale + scrollable
		const class_scrollable_part = ()=>{
			const {MENU, ITEM} = classNames;
			return {
				// contains only differences from its base
				menu : {
					css : '\n'
						+ '/* class_scrollable_part (menu)*/\n'
						+ `.${MENU}.scrollable{`
						+ '  height: var(--verticalScroll);'
						+ '  overflow-y: hidden;'
						+ '}\n'
				},
				item : {
					css : '\n'
						+ '/* class_scrollable_part (item)*/\n'
						+ `.${ITEM}.scrollControl{`
						+ '  background-color: #00fd5769;'
						+ '  text-align: center;'
						+ '  width: 100%;'        // \
						+ '  padding-left: 0px;'  //  | work together
						+ '  padding-right: 0px;' // /
						+ '  position: sticky;'
						+ '  z-index: 1;'
						+ '  display: none;'
						+ '}\n'
						+ `.${ITEM}.scrollControl.above{`
						+ '  top: 0px;'
						+ '}\n'
						+ `.${ITEM}.scrollControl.below{`
						+ '  bottom: 0px;'
						+ '}\n'
						+ `.scrollable .${ITEM}.scrollControl{` // TODO : maybe use '>' instead ' ' selector constraint
						+ '  display: unset;'
						+ '}\n'
						
						//+ `.${ITEM}.vrtscrl-insider{`
						//+ '  background-color: #ffff0069;' // debug
						//+ '}\n'
						+ `.${ITEM}.vrtscrl-outsider{`
						+ '  background-color: #00000069;' // debug
						+ '  pointer-events: none;'
						+ '  opacity: 0.3;'
						+ '}\n'
						//+ `.${ITEM}.vrtscrl-topsider{`
						//+ '  background-color: #ff00ff69;' // debug
						//+ '}\n'
						//+ `.${ITEM}.vrtscrl-botsider{`
						//+ '  background-color: #00ff0069;' // debug
						//+ '}\n',
				},
			};
		};

		const stdScrollable_additional_inits = ()=>{
			const {SEPARATOR} = classNames;
			return {
				menu : (menu, uKey)=>{
	
					// html elements
					//
					const aboveElem = document.createElement('div');
					const belowElem = document.createElement('div');
					aboveElem.className = 'item scrollControl above';
					belowElem.className = 'item scrollControl below';
					aboveElem.textContent = '◢◣';
					belowElem.textContent = '◥◤';
	
					aboveElem.onclick = (e)=>{
						scroll_up();
					};
					belowElem.onclick = (e)=>{
						scroll_down();
					};
	
					menu.onmousewheel = (e)=>{
						e.preventDefault();
						if(e.deltaY < 0) scroll_up();
						if(e.deltaY > 0) scroll_down();
					};
	
					let items = menu[uKey].elems.get_items();
					items[0].insertAdjacentElement('beforebegin', aboveElem);
					items.at(-1).insertAdjacentElement('afterend', belowElem);
	
					const update_itemsList = ()=>{ // uses this process in limiter.init()
						items = items.filter(      // because all menus' init run before all items' init
							item=>!item.classList.contains(SEPARATOR)
						);
					};
	
					// logic
					//
	
					const scroll_up = ()=>{
						if(menu[TMEM].stdScroll.isDownscaled){
							menu.scrollTop -= limiter.get_topsiderOffset();
							limiter.check_itemInLimit();
							menu[uKey].elems.close_submenus();
						}
					};
					const scroll_down = ()=>{
						if(menu[TMEM].stdScroll.isDownscaled){
							menu.scrollTop -= limiter.get_botsiderOffset();
							limiter.check_itemInLimit();
							menu[uKey].elems.close_submenus();
						}
					};
	
					const limiter = {
						insiders:null, topsiders:null, botsiders:null, // items arrays
						limits : null, // vertical rect
						init(){
							update_itemsList();
							this.update_vrtLimit();
							this.check_itemInLimit();
						},
						update_vrtLimit(){
							const aboveRect = aboveElem.getBoundingClientRect();
							const belowRect = belowElem.getBoundingClientRect();
							this.limits = {t:aboveRect.bottom, b:belowRect.top};
						},
						check_itemInLimit(){
							const {t:topLimit, b:downLimit} = this.limits;
							this.insiders = [], this.topsiders = [], this.botsiders = [];
							let inside = false;
							items.forEach(item=>{
								this.remove_siderClass(item);
								const itemRect = item[uKey].update_rect().get_rect();
								const current = (topLimit <= itemRect.t && downLimit >= itemRect.b);
								inside ||= current;
								if(current){
									this.insiders.push(item); // inside scroll view
									item.classList.add('vrtscrl-insider');
								}else if(!inside){
									this.topsiders.push(item); // top outside scroll view
									item.classList.add('vrtscrl-topsider', 'vrtscrl-outsider');
								}else{
									this.botsiders.push(item); // bottom outside scroll view
									item.classList.add('vrtscrl-botsider', 'vrtscrl-outsider');
								}
							});
						},
						get_topsiderOffset(){
							const yItem = this.topsiders.at(-1)?.[uKey].get_rect().t;
							const yLimit = this.limits.t;
							return yItem ? yLimit - yItem : 0;
						},
						get_botsiderOffset(){
							const yItem = this.botsiders[0]?.[uKey].get_rect().b;
							const yLimit = this.limits.b;
							return yItem ? yLimit - yItem : 0;
						},
						remove_siderClass(elem){ // for one item
							const prfx = 'vrtscrl-';
							const names = ['insider', 'outsider', 'topsider', 'botsider'];
							names.forEach(name=>elem.classList.remove(prfx+name))
						},
						reset_siderClass(){ // for all items
							items.forEach(item=>this.remove_siderClass(item));
						},
					};
	
					menu[TMEM] ||= {};
					menu[TMEM].stdScroll = {};
					menu[TMEM].stdScroll.isDownscaled = false;
					menu[TMEM].stdScroll.rescale_height = (newHeight)=>{
						menu.style.setProperty('--verticalScroll', newHeight);
						menu.classList.add('scrollable');
						const menuRect = menu[uKey].update_rect().get_rect();
						if(menuRect.h < menu.scrollHeight){
							menu[TMEM].stdScroll.isDownscaled = true;
							limiter.init();
						}else{
							menu[TMEM].stdScroll.isDownscaled = false;
							menu.classList.remove('scrollable');
							limiter.reset_siderClass();
						}
						if(menu[uKey].elems.is_main()) menu[uKey].elems.update_layerPos();
					};
					menu[TMEM].stdScroll.reset_height = ()=>{
						if(menu[TMEM].stdScroll.isDownscaled){
							menu[TMEM].stdScroll.isDownscaled = false;
							menu.classList.remove('scrollable');
							limiter.reset_siderClass();
							if(menu[uKey].elems.is_main()) menu[uKey].elems.update_layerPos();
						}
					};
	
				},
			};
		};





		// AAA


		//const _baseMain = mix_base(_base, _behavMain);


		const _class_base = mix_base(
			_base, _behav, class_base(), class_behav(), class_sizeFitContent_part()
		);






		// EMPTY THEME
		//
		
		const empty_base = mix_base(_base, _behav, openRight_part());

		const emptyClass_base = mix_base(_class_base, openRight_part());

		





		


		// ORIGNAL THEMES [ITEM SEPARATOR]
		const original_itemSeparator_base = mix_base(sccm_NULL, class_itemSeparator_part());









		

		







		// DEFAULT THEME
		//

		// MUST HAVE AT LEAST ALL TYPES (_all/root/layer/menu/item/behaviors) EVENT IF ARE EMPTY
		const sccm_default_cosmetic = ()=>{ // SCCM original default style
			const {GENERAL, MAIN, MENU, ITEM, CLOSED, HOVERED, INPATH, NOTAVAILABLE} = classNames;
			return {
				_all : {
					css : '\n'
						+ `.${GENERAL}{`
						+ '  padding : var(--padding);'
						+ '}\n',
				},
				root : {},
				layer : {},
				menu  : {
					class : [GENERAL],
					css : '\n'
						+ `.${MENU}{`
						+ '  background-color : grey;'
						+ '  gap : 2px;'
						+ '}\n',
				},
				item  : {
					class : [GENERAL],
					css : '\n'
						+ `.${ITEM}{`
						+ '  background-color : lightgrey;'
						+ '}\n'
						+ `.${INPATH}{`
						+ '  background-color : orange;'
						+ '}\n'
						+ `.${HOVERED}{`
						+ '  background-color : crimson;'
						+ '}\n'
						+ `.${NOTAVAILABLE}{`
						+ '  color : green;'
						+ '}\n',
				},
				behaviors : {
					// binders
					//
				},
			};
		};

		// tmp glo var for settings
		padding = '2px';
		border  = '0px';
		total   = '2px';
		time    = '1s';

		const default_base = mix_base(
			_base, _behav, _cssvar(padding,border,total,time), // padd/bord/total
			class_base(), class_behav(), class_sizeFitContent_part(),
			class_ptrLogic_part(), sccm_default_cosmetic(),
			class_displayLogic_part(), classFading_standard_part(),
			class_stdFold_part(), stdFold_behav(),

			class_scrollable_part(),
		);
		const default_baseMain = mix_base(
			sccm_NULL, _behavMain, class_baseMain(),
		);

		const default_addonInit = stack_addonInit(
			overlapInterlacing_additional_inits(),
			class_stdFoldFollowLastSens_additional_inits(),

			stdScrollable_additional_inits(),
			stdFold_windowAsFrameRect_additional_inits(),
		);

















		// ORIGINAL GLASS THEME
		//

		// MUST HAVE AT LEAST ALL TYPES (_all/root/layer/menu/item/behaviors) EVENT IF ARE EMPTY
		const sccm_glass_cosmetic = ()=>{ // SCCM original glass style
			const {GENERAL, MENU, ITEM, CLOSED, HOVERED, INPATH, NOTAVAILABLE} = classNames;
			return {
				_all : {
					css : '\n'
						+ '/* sccm_glass_cosmetic (_all) */\n'
						+ `.${GENERAL}{`
						+ '  padding : var(--padding);'
						+ '  font-size : 20px;'
						+ '}\n'
				},
				root : {},
				layer : {
					style:{
						boxShadow:'inset 0px 0px 0px 6px rgba(34, 136, 255, 0.533)',
						zIndex : 0,
					}}, // debug
				menu  : {
					class : [GENERAL],
					css : '\n'
						+ '/* sccm_glass_cosmetic (menu) */\n'
						+ `.${MENU}{`
						+ '  background-color : #00000060;'
						+ '  gap : 2px;'
						+ '}\n'
				},
				item  : {
					class : [GENERAL, 'item'], // TODO check if 'item' is required
					css : '\n'
						+ '/* sccm_glass_cosmetic (item) */\n'
						+ `.${ITEM}{`
						+ '  padding : 4px 128px 4px 24px;'
						+ '  border-radius: 2px;'
						+ '  box-shadow: inset -3px -2px 9px 0px white;'
						+ '  background: linear-gradient(to top, #00000000 0%, #FFFFFF88 100%);'
						+ '  backdrop-filter: blur(25px);'
						//+ '  text-shadow: -1px 0px 0px white, 1px 1px 1px black, 1px 1px 5px white;'
						+ '  text-shadow: 1px 1px 0px white, 2px 2px 1px black;'
						+ '  color : #00817540;'
						+ '  font-family: Poppins, sans-serif;'
						+ '}\n'
						+ `.${INPATH}{`
						+ '  background-color : orange;'
						+ '}\n'
						+ `.${HOVERED}{`
						+ '  background-color : #006dfd69;'
						+ '}\n'
						+ `.${NOTAVAILABLE}{`
						+ '  color : green;'
						+ '}\n',
				},
				behaviors : {
				},

			};
		};

		// tmp glo var for settings
		padding = '2px';
		border  = '0px';
		total   = '2px';
		time    = '1s';

		const glass_base = mix_base(
			_base, _behav, _cssvar(padding,border,total,time),
			class_base(), class_behav(),
			class_sizeFitContent_part(),
			class_ptrLogic_part(),
			stdFold_behav(), class_stdFold_part(), // 2 px :  equal to padding
			classFading_itemBackdrop_part(), sccm_glass_cosmetic(),
		);
		const glass_baseMain = mix_base(

		);






		// AAA

		// SLIDING (DEFAULT) THEME
		//

		


		



		


		

		



		// sliding possible conf :

		// base add : _base AND _behav AND _cssvar AND class_base AND class_behav AND class_ptrLogic_part AND class_sizeFitContent_part

		// always add : class_stdFold_part AND class_slidingStartPos_part

		// optional add : class_slidingStartPosMain_part

		// optional add : class_stdFoldFollowLastSens_additional_inits

		// always add : sliding_behav

		// always add : overlapInterlacing_additional_inits XOR overlapInvertDepth_additional_inits

		// optional add : class_slidingNotLockMain_part XOR class_slidingNotLockOpen_part

		// always add : sliding_additional_inits

		// optional add : slidingFollowMove_additional_inits

		// always add : onlySliding_additional_inits XOR
		//              merge_stdFadingWithSliding AND stdFadingWithSliding_additional_inits XOR
		//              merge_itmbdropFadingWithSliding AND itmbdropFadingWithSliding_additional_inits

		// optional add : stdScrollable_additional_inits AND stdFold_windowAsFrameRect_additional_inits

		// tmp glo var for settings
		padding = '2px';
		border  = '0px';
		total   = '2px';
		time    = '1s';

		const sliding_base = mix_base(
			_base, _behav, _cssvar(padding,border,total,time), // padd/bord/total
			class_base(), class_behav(),
			class_sizeFitContent_part(),
			class_ptrLogic_part(),
			class_slidingStartPos_part(), class_slidingStartPosMain_part(), class_stdFold_part(),
			classFading_itemBackdrop_part(), sccm_glass_cosmetic(),
			sliding_behav(), merge_itmbdropFadingWithSliding(),
			//class_stdFoldClose_part(),
			class_slidingNotLockOpen_part(),

			class_scrollable_part(),
		);

		const sliding_baseMain = mix_base(
			sccm_NULL, _behavMain, class_baseMain(),
		);

		const sliding_addonInit = stack_addonInit(
			class_stdFoldFollowLastSens_additional_inits(),
			overlapInvertDepth_additional_inits(),
			sliding_additional_inits(),
			slidingFollowMove_additional_inits(),
			itmbdropFadingWithSliding_additional_inits(),


			stdScrollable_additional_inits(),
			stdFold_windowAsFrameRect_additional_inits(),
		);

		const slidingMain_addonInit = stack_addonInit(
			class_slidingStartPosMain_additional_inits(),
		);







		// WIN10 THEME
		//

		// contains only differences from its base
		const win10_base_OLD = mix_base(_class_base, { // win10 style base
			menu : {
				style : {
					left : 'calc(100% - 3px)',
					top : '-3px', // border 1 + padding 2
				},
			},
		});

		// WIN10 THEMES [ITEM SEPARATOR]
		const win10_itemSeparator_base = mix_base(sccm_NULL, class_itemSeparator_part());

		// MUST HAVE AT LEAST ALL TYPES (_all/root/layer/menu/item/behaviors) EVENT IF ARE EMPTY
		const win10_cosmetic = ()=>{ // win10 style
			const {GENERAL, MAIN, MENU, ITEM, CLOSED, HOVERED, INPATH, NOTAVAILABLE, SEPARATOR} = classNames;
			return {
				_all : {
					css : '\n'
						+ `.${GENERAL}{`
						+ '  padding : var(--padding);'
						+ '  font-size : 12px;'
						+ '  font-family: "Segoe UI", Arial, sans-serif;'
						+ '}\n',
				},
				root : {},
				layer : {},
				menu  : {
					class : [GENERAL],
					css : '\n'
						+ `.${MENU}{`
						+ '  background-color : #EEEEEE;'
						//+ '  padding : 2px;'
						+ `  border : var(--border) solid #A0A0A0;`
						+ '  box-sizing : border-box;'
						+ '  box-shadow: 5px 5px 5px -5px black;'     // respects outside corners shadow pixel offset \ Use a pseudo elem ::before
						+ '  box-shadow: 5px 5px 4px -3px #00000080;' // respects inside corners shadow pixel offset  / using shadow to get perfect result
						+ '}\n',
						/* + `.${CLOSED}{`
						+ '  opacity : 0;' // TODO remove it and update base
						+ '}\n', */
				},
				item  : {
					class : [GENERAL],
					css : '\n'
						+ `.${ITEM}{`
						+ '  background-color : #EEEEEE;'
						+ '  padding : 4px 128px 4px 32px;'
						//+ '  mix-blend-mode: darken;'
						+ '}\n'
						+ `.${INPATH}{`
						+ '  background-color : white;'
						+ '}\n'
						+ `.${HOVERED}{`
						+ '  background-color : white;'
						+ '}\n'
						+ `.${NOTAVAILABLE}{`
						//+ '  color : #6D6D6D;'
						+ '  color : #6A6A6A;'
						+ '}\n'
						+ `.${SEPARATOR}{`
						+ '  background-color : #A0A0A0;'
						+ '  margin: 4px 10px;'
						+ '  height : 1px;'
						+ '  padding : 0px;'
						+ '}\n'
				},
				behaviors : {
					
				},
			};
		};



		// tmp glo var for settings
		padding = '2px';
		border  = '1px';
		total   = '-3px';
		time    = '1s';

		// win10 style base
		//const win10_base = mix_base(_class_base, win10_cosmetic());

		const win10_base = mix_base(
			_base, _behav, _cssvar(padding,border,total,time), // padd/bord/total
			class_base(), class_behav(), class_sizeFitContent_part(),
			class_ptrLogic_part(), win10_cosmetic(),
			class_displayLogic_part(),
			class_stdFold_part(), stdFold_behav(),
		);

		const win10_baseMain = mix_base(
			sccm_NULL, _behavMain, class_baseMain(),
		);

		const win10_addonInit = stack_addonInit(
			overlapInterlacing_additional_inits(),
			class_stdFoldFollowLastSens_additional_inits(),
		);





		// MACOSX THEME
		//


		// general (contextual and horizontal)
		//

		// contains only differences from its base
		const macosx_cosmetic = ()=>{ // macosx style base
			const {GENERAL, MAIN, MENU, ITEM, CLOSED, HOVERED, INPATH, NOTAVAILABLE, SEPARATOR} = classNames;
			return {
				_all : {
					css : '\n'
						+ `.${GENERAL}{`
						+ '  font-size : 15;'
						+ '  font-family: "SF Pro", Arial, sans-serif;'
						+ '}\n',
				},
				menu  : {
					class : [GENERAL],
					css : '\n'
						+ `.${MENU}{`
						+ '  left : calc(100% - 1px);'
						+ '  top : -5px;' // border 1 + padding 4
						+ '  background-color: rgba(230, 230, 230, 0.6);'
						+ '  backdrop-filter: blur(50px);'
						+ '  padding : 4px 0px;'
						+ '  border : 1px solid rgba(150, 150, 150, 0.5);'
						+ '  border-radius : 4px;'
						+ '  box-sizing : border-box;'
						+ '  box-shadow: 0px 8px 15px rgba(0, 0, 0, 0.35);' // web ref
						+ '  box-shadow: 4px 6px 12px -4px rgba(0, 0, 0, 0.35);' // my ajustement
						+ '}\n'
						+ `.${MAIN}{`
						+ '  left : 0px;'
						+ '  top : 0px;'
						+ '}\n'
						+ `.${CLOSED}{`
						+ '  opacity : 0;'
						+ '}\n',
				},
				item  : {
					class : [GENERAL],
					css : '\n'
						+ `.${ITEM}{`
						//+ '  background-color: rgba(230, 230, 230, 0.9);'
						+ '  padding : 4px 128px 4px 24px;'
						+ '}\n'
						+ `.${INPATH}{`
						+ '  background-color : rgba(73, 154, 251, 1);'
						+ '  color : white;'
						+ '}\n'
						+ `.${HOVERED}{`
						+ '  background-color : rgba(73, 154, 251, 1);'
						+ '  color : white;'
						+ '}\n'
						+ `.${NOTAVAILABLE}{`
						+ '  color : #6A6A6A;'
						+ '}\n'
						+ `.${SEPARATOR}{`
						+ '  margin : 4px 0px;'
						+ '  padding : 0px;'
						+ '  height : 2px;'
						+ '  background-color : rgba(150, 150, 150, 0.3);'
						+ '}\n',
				},
			};
		};


		// contextual //
		//

		// MUST HAVE AT LEAST ALL TYPES (_all/root/layer/menu/item/behaviors) EVENT IF ARE EMPTY
		const macosx_base = mix_base(
			_base, _behav, class_base(), class_behav(),
			class_sizeFitContent_part(), class_ptrLogic_part(), macosx_cosmetic()
		);

		// MUST HAVE AT LEAST ALL TYPES (_all/root/layer/menu/item/behaviors) EVENT IF ARE EMPTY
		const macosx_baseMain = mix_base(
			sccm_NULL, _behavMain, class_baseMain()
		);


		// horizontal //
		//

		// contains only differences from its base
		const macosxHrz_cosmetic = ()=>{
			const {MAIN, SUBMAIN, ITEM, HORIZONTAL} = classNames;
			return {
				menu : {
					
					css : '\n'
						+ `.${MAIN}{`
						+ '  width : 100%;'
						+ '  grid-auto-flow : column;'
						+ '  justify-content : start;'
						+ '  align-items : center;'
						+ '  padding : 0px 16px;'
						+ '  border-radius : 0px;'
						+ '}\n'
						+ `.${SUBMAIN}{`
						+ '  left : 0px;'
						+ '  top : 100%;'
						+ '}\n',
				},
				item : {
					css : '\n'
						//+ `.${HORIZONTAL}>.${ITEM}{`
						+ `.${HORIZONTAL}.${ITEM}{`
						+ '  padding : 4px 12px;'
						+ '}\n',
				},
			};
		};

		// contains only differences from its base
		const macosxHrz_rectLogic = ()=>{
			return {
				root : {
					style : {
						position : '', // reset from _base
					},
				},
			};
		};

		// MUST HAVE AT LEAST ALL TYPES (_all/root/layer/menu/item/behaviors) EVENT IF ARE EMPTY
		const macosxHrz_base = mix_base(macosx_base, macosxHrz_cosmetic(), macosxHrz_rectLogic());

		// main menu
		//

		const macosxHrz_partMain = ()=>{
			const {HORIZONTAL} = classNames;
			return {
				// contains only differences from its base
				layer : {
					style : {
						minWidth : '100%',
					},
				},
				menu : {
					class : [HORIZONTAL],
				},
				item : {
					class : [HORIZONTAL],
				},
			};
		};

		// MUST HAVE AT LEAST ALL TYPES (_all/root/layer/menu/item/behaviors) EVENT IF ARE EMPTY
		const macosxHrz_baseMain = mix_base(macosx_baseMain, macosxHrz_partMain());

		// submain menu
		//
	
		const macosxHrz_partSubmain = ()=>{
			const {SUBMAIN} = classNames;
			return {
				// contains only differences from its base
				menu : {
					class : [SUBMAIN],
				},
			};
		};
		
		// MUST HAVE AT LEAST ALL TYPES (_all/root/layer/menu/item/behaviors) EVENT IF ARE EMPTY
		const macosxHrz_baseSubmain = mix_base(sccm_NULL, macosxHrz_partSubmain());


		/*
		    HANDLE ADDITIONAL MANUAL SETTINGS :
		    -----------------------------------
		    handle.style.position = 'fixed' ;
		    handle.style.width    =  '100%' ;
		    handle.style.left     =   '0px' ;
		    handle.style.top      =   '0px' ;
		*/
		const macosxHrz_setHandleConfig_part = ()=>{
			// use on handle, like that :
			//   providing.theme.macosx.get_horizontalSetHandleConfig('handle').init(handle)
			return {
				root : {
					style : {
						position : 'fixed',
						width    : '100%',
						left     : '0px',
						top      : '0px',
					},
				},
			};
		};

		const macosxHrz_setHandleConfig = mix_base(sccm_NULL, macosxHrz_setHandleConfig_part());

		// macosx item separator
		//

		const macosx_setSeparatorClass = mix_base(sccm_NULL, class_itemSeparator_part());
		








		// AAA

		return { // object depth 2 : groups <- themes
			DEBUG : {
				cssMixingDebug : make_themeGenerator(cssMixingDebug_A, cssMixingDebug_B), // debug
			},
			empty : {
				minimal : make_themeGenerator(empty_base, sccm_NULL),
				withClass : make_themeGenerator(emptyClass_base, sccm_NULL),
			},
			sccmOriginal : {
				default     : make_themeGenerator(default_base, sccm_NULL, default_addonInit),
				defaultMain : make_themeGenerator(default_base, default_baseMain),
				glass     : make_themeGenerator(glass_base, sccm_NULL),
				glassMain : make_themeGenerator(glass_base, default_baseMain),
				fading : null,
				sliding : make_themeGenerator(sliding_base, sccm_NULL, sliding_addonInit),
				slidingMain : make_themeGenerator(sccm_NULL, sliding_baseMain, slidingMain_addonInit),
				growing : null,
				growingMain : null,
				//
				separator : make_themeGenerator(original_itemSeparator_base, sccm_NULL),
			},
			windows10 : {
				default : make_themeGenerator(win10_base, sccm_NULL, win10_addonInit),
				defaultMain : make_themeGenerator(win10_base, win10_baseMain),
				noFading : null,
				//
				separator : make_themeGenerator(win10_itemSeparator_base, sccm_NULL),
			},
			macosx : {
				default     : make_themeGenerator(macosx_base, sccm_NULL),
				defaultMain : make_themeGenerator(macosx_base, macosx_baseMain),
				//
				horizontal        : make_themeGenerator(macosxHrz_base, sccm_NULL),
				horizontalMain    : make_themeGenerator(macosxHrz_base, macosxHrz_baseMain),
				horizontalSubmain : make_themeGenerator(macosxHrz_base, macosxHrz_baseSubmain),
				horizontalSetHandleConfig : make_themeGenerator(macosxHrz_setHandleConfig, sccm_NULL),
				//
				separator : make_themeGenerator(macosx_setSeparatorClass, sccm_NULL),
			},
		}
	})();

	// debug export
	SCCM.providing ??= {};
	SCCM.providing.theme ??= {};
	

	// AUTO MAKES PUBLIC FEATURES
	// - add prefix (set_ / get_)
	// - does no check
	// - protects 'this' var
	// - export to main api
	Object.keys(core.theme).forEach(gname=>{ //groupname
		const group = core.theme[gname];
		Object.keys(group).forEach(tname=>{ // themename
			SCCM.providing.theme[gname] ??= {};
			SCCM.providing.theme[gname]['set_'+tname] = (user_key, usr_theme)=>{ group[tname].set(user_key, usr_theme); };
			SCCM.providing.theme[gname]['get_'+tname] = (specify_elem)=>{ return group[tname].get(specify_elem); };
		});
	});


	core.preventOverflowLib = (()=>{

		const TMEM = core.theme_key;

		// simple 2D point test in rect area
		//

		// 6 args version
		const isPoint_onRect6 = function(xp,yp, xr,yr, wr,hr){
			// args : xpoint, ypoint, xrect, yrect, wrect, hrect
			return !(xr>xp) && (xp<xr+wr) && !(yr>yp) && (yp<yr+hr); // new (alt 2)
		};

		// 2 args version
		const isPoint_onRect2 = function({x:xp,y:yp}, {x:xr,y:yr, w:wr,h:hr}){
			// args : point{x,y}, rect{x,y,w,h}
			// vars : xpoint, ypoint, xrect, yrect, wrect, hrect
			return !(xr>xp) && (xp<xr+wr) && !(yr>yp) && (yp<yr+hr); // new (alt 2)
		};

		/* const rect_to_box = (rect, R=rect)=>{
			// convert {x,y, w,h} to {l, r, t, b}
			return {l:R.x, r:R.x+R.w, t:R.y, b:R.y+R.h};
		}; */

		const inBoundRule = { // all methods return 'in bound test result' (bool)
			l : (elemL,frameL)=>elemL>frameL,
			r : (elemR,frameR)=>elemR<frameR,
			t : (elemT,frameT)=>elemT>frameT,
			b : (elemB,frameB)=>elemB<frameB,
		};

		const check_precalcSides = ({elem, sides, frameRect, reversable})=>{
			//const frameBox = rect_to_box(frameRect);
			
			let sideNames = Object.keys(sides);
			if(reversable)
			if(elem[TMEM]?.stdFold_followLastSens?.reverseSens)
				sideNames = sideNames.toReversed();

			for(const sideName of sideNames){

				// get side object
				const side = sides[sideName];

				// get elem rect
				const {elemRect} = side;

				// tests open side conditions
				let inBound = true;
				for(const brd of side.checkBorderList||[]){
					//inBound = inBoundRule[brd]( elemRect[brd], frameBox[brd] );
					inBound = inBoundRule[brd]( elemRect[brd], frameRect[brd] );
					if( !inBound ) break;
				}
				
				if(inBound) return sideName;
			}

			return null;
		};

		const to_translated = (x,y, rect)=>{
			const out = {...rect};
			if(x) for(const prop of ['x','l','r']) out[prop] += x;
			if(y) for(const prop of ['y','t','b']) out[prop] += y;
			return out;
		};

		const to_origine = ({w,h}, x=0, y=0)=>{
			return {x,y,w,h, l:x, r:w, t:y, b:h};
		};

		const precalcPresets = {
			standard : {
				layerRect : null,
				menuRect  : null,
				isMain    : null,
				ofst      : null,
				frameRect : null,
				setup(menu, uKey, symetricOffset=0, frameRect){
					const layer = menu[uKey].elems.get_layer();
					this.menuRect = menu[uKey].update_rect().get_rect();
					this.layerRect = layer[uKey].update_rect().get_rect();
					this.isMain = menu[uKey].elems.is_main();
					this.ofst = symetricOffset;
					this.frameRect = frameRect;
				},
				make_RIGHTLEFT(){ // RIGHTLEFT
					const {layerRect:layer, menuRect:menu, ofst, frame:frameRect} = this;

					if(this.isMain) return { // main menu case
						RIGHT : {
							elemRect : to_translated(0,0, layer),
							checkBorderList : ['r'],
						},
						LEFT : {
							elemRect : to_translated(-layer.w,0, layer),
							checkBorderList : ['l'],
						},
					};else return{ // submenu cases
						RIGHT : {
							elemRect : to_translated(layer.r-menu.l+ofst,0, menu),
							checkBorderList : ['r'],
						},
						LEFT : {
							elemRect : to_translated(layer.l-menu.r-ofst,0, menu),
							checkBorderList : ['l'],
						},
					};
				},
				make_DOWNTOP(){ // DOWNTOP
					const {layerRect:layer, menuRect:menu, ofst, frameRect:frame} = this;

					if(this.isMain) return { // main menu case
						DOWN : {
							elemRect : to_translated(0,0, layer),
							checkBorderList : ['b'],
						},
						TOP : {
							elemRect : to_translated(0,-layer.h, layer),
							checkBorderList : ['t'],
						},
					};else return{ // submenu cases
						DOWN : {
							elemRect : to_translated(0,layer.t-menu.t-ofst, menu),
							checkBorderList : ['b'],
						},
						TOP : {
							elemRect : to_translated(0,layer.b-menu.b+ofst, menu),
							checkBorderList : ['t'],
						},
					};
				},
				make_lastResort_DOWNTOP(){
					const {layerRect:layer, menuRect:menu, ofst, frameRect:frame} = this;

					const TOPWIN = {
						elemRect : to_origine(menu),
						checkBorderList : ['b'],
						cssVar : {
							name : '--topwinOfst',
							value : (frame.t - layer.t) + 'px',
						},
					};

					if(this.isMain) return { // main menu case
						TOPWIN,
					};else return{ // submenu cases
						TOPWIN,
					};
				},
			},
		};


		const run_stdPresetProcess = (SIDESNAME, reversable, menu, uKey, symetricOffset=0)=>{
			const defaultFrameRect = get_currentWindowRect(); // window as
			const frameRect = menu[TMEM]?.stdFold_frameRect?.get() || defaultFrameRect;
			precalcPresets.standard.setup(menu, uKey, symetricOffset, frameRect);
			const SIDES = precalcPresets.standard['make_'+SIDESNAME]();
			const settings = {elem:menu, sides:SIDES, frameRect, reversable};
			
			const sideName = check_precalcSides(settings);
			const sideNames = Object.keys(SIDES);
			const defaultSide = sideNames[0];
			const inBound = !!sideName;

			const lastResort = inBound ? null : (()=>{
				const SIDES = precalcPresets.standard['make_lastResort_'+SIDESNAME]?.();
				if(!SIDES) return {status:false, sideName:null, offset:0};
				let sideName = check_precalcSides({...settings, sides:SIDES, reversable:false});
				const inBound = !!sideName;
				sideName = Object.keys(SIDES)[0];
				return {status:inBound, sideName, cssVar:SIDES[sideName].cssVar};
			})();

			return {status:inBound, sideName, defaultSide, lastResort};
		};


		// In bad using case (undef args) : writes and reads to/from void,
		// (but does not warn about to).
		// can create path end property, but cannot create ancestor chain if some are missing,
		// (and besides, that should crash execution).
		const resolve_propPath = (str_propPath='', obj_root={})=>{
			const path = str_propPath.split('.');
			const propertyName = path.pop();
			const objectRef = path.reduce( (acc,cur)=>acc[cur], obj_root );
			return {
				set : (val)=>objectRef[propertyName]=val,
				get : ()=>objectRef[propertyName],
				obj : objectRef,
				prop : propertyName,
			};
		};

		const make_sideMethods = ({style, class:classRef, otherProp})=>{ // ('class' is a reserved word)
			// style = {prop:value, ...}
			// classRef = { addset:[name, ...], remset:[name, ...] }
			// otherProp = {'prop.prop....':value, ...}
			let mem = null; // backups affected prop's current value
			return {
				setOpen(elem){
					mem = { style:{}, classRef:'', otherProp:{} };
					// style : setup
					for(const sName in style){
						mem.style[sName] = elem.style[sName]; // save prop's current value
						elem.style[sName] = style[sName]; // overwrite prop's mem
					}
					// class : setup
					mem.classRef = elem.className;
					classRef?.addset.forEach( cname=>elem.classList.add(cname) );
					classRef?.remset.forEach( cname=>elem.classList.remove(cname) );
					// other : setup
					for(const propPath in otherProp){
						const access = resolve_propPath(propPath, elem);
						mem.otherProp[propPath] = {value:access.get(), restor(){access.set(this.value)}};
						access.set(otherProp[propPath]);
					}
				},
				cancel(elem){ // restor original value
					if(mem){
						// style : setback
						for(const sName in style)
							elem.style[sName] = mem.style[sName];
						// class : setback
						if(classRef) elem.className = mem.classRef;
						// other : setback
						for(const propPath in otherProp) mem.otherProp[propPath].restor();
						// (resets to 'undefined' instead deleting for missing end chain props that were set in setOpen)
					}
					mem = null;
				},
			};
		};

		return {
			make_sideMethods, check_precalcSides, precalcPresets, run_stdPresetProcess
		};
	})();

	// MAKES PUBLIC FEATURES
	// - does no check
	// - protects 'this' var
	// - export to main api
	SCCM.providing ??= {};
	SCCM.providing.preventOverflowLib = {};

	SCCM.providing.preventOverflowLib.check_precalcSides = (settings)=>{
		core.preventOverflowLib.check_precalcSides(settings);
	};

	SCCM.providing.preventOverflowLib.precalcPresets = core.preventOverflowLib.precalcPresets;

	SCCM.providing.preventOverflowLib.run_stdPresetProcess = (SIDESNAME, reversable, menu, uKey, symetricOffset=0)=>{
		core.preventOverflowLib.run_stdPresetProcess(SIDESNAME, reversable, menu, uKey, symetricOffset=0);
	};

	SCCM.providing.preventOverflowLib.make_sideMethods = (settings)=>{
		core.preventOverflowLib.make_sideMethods(settings);
	};



	// independant Rect System (external lib)
	//

	// renames 'width' as 'w' and 'height' as 'h'
	// captures rect bounding by according boxSizing
	let get_rect = (elem, boxSizing)=>{
		let tmp_boxSizing = elem.style.boxSizing;
		elem.style.boxSizing = boxSizing;

		let R = elem.getBoundingClientRect();
		elem.style.boxSizing = tmp_boxSizing;

		return {x:R.x, y:R.y, w:R.width, h:R.height, l:R.left, r:R.right, t:R.top, b:R.bottom};
	};

	let get_borderRect = (elem)=>{
		return get_rect(elem, 'border-box');
	};

	let get_elemRect = (elem)=>{
		return get_rect(elem, 'content-box');
	};

	let make_itselfRectSys = (elem)=>{
		return {
			props : {x:0,y:0,w:0,h:0, l:0,r:0,t:0,b:0},
			rounded : null,
			get_copy(){
				return (this.rounded ? this.get_round() : this.get_raw());
			},
			get_raw(){
				return {...this.props};
			},
			rect_method : get_borderRect,
			update(){
				this.props = this.rect_method(elem);
				this.rounded = null;
			},
			set_borderRect(bool){
				this.rect_method = bool ? get_borderRect : get_elemRect;
			},
			round(){
				const tmp = this.get_copy();
				for(const prop in tmp) tmp[prop] = Math.round(tmp[prop]);
				this.rounded = tmp;
			},
			get_round(){
				return {...this.rounded};
			},
		};
	};

	const get_currentWindowRect = (x=0, y=0, w=innerWidth, h=innerHeight)=>{
		return {x,y,w,h, l:x, r:w, t:y, b:h};
	};

	// SCCM KEYRING
	//

	core.key = {
		PRIV_MEM : Symbol('SCCM_PRIVATE_MEMORY'),
		ROOT     : Symbol('SCCM_ROOT'),
		LAYER    : Symbol('SCCM_LAYER'),
		MENU     : Symbol('SCCM_MENU'),
		OPEN     : Symbol('SCCM_OPEN'),
		CLOSED   : Symbol('SCCM_CLOSED'),
		ITEM     : Symbol('SCCM_ITEM'),
		INPATH   : Symbol('SCCM_INPATH'),
		OUTPATH  : Symbol('SCCM_OUTPATH'),
		FEATURE  : Symbol('SCCM_FEATURE'),
		SUBMENU  : Symbol('SCCM_SUBMENU'),
		USABLE   : Symbol('SCCM_USABLE'),
		UNUSABLE : Symbol('SCCM_UNUSABLE'),
		MAINELEM : Symbol('SCCM_MAINELEM'),
		AREAELEM : Symbol('SCCM_AREAELEM'),
		BUSYLOCK : Symbol('SCCM_BUSYLOCK'),
		READYNOW : Symbol('SCCM_READYNOW'),

		/* // UNUSED TODO remove at dev end
		HOVER    : Symbol('SCCM_HOVER'),
		LEAVE    : Symbol('SCCM_LEAVE'),
		OUTOF    : Symbol('SCCM_OUTOF'),
		*/
	};


	// function rank logic : set -> make -> build -> create
	//
	// style priority      : style = usr_css || default_css
	// 
	// init priotity       : main_init={...default_init,...usr_main_init}; main_init(); usr_elem_init();
	//
	// behavior priority   : behavior = {...default_behavior, ...usr_main_behavior, ...usr_elem_behavior}



	core.create_menuStructure = function(usrTemplate, usrMemKey){
		
		if(!usrTemplate.mainMenu) throw new Error('SCCM : menu root missing mainMenu in template menu Object.');

		let check_handleOpen = ()=>{
			if(!instance.isOpen) console.warn('SCCM : Attention main menu is currently closed');
		};

		let check_handleConnexion = ()=>{
			if(!handle.isConnected) throw new Error('Menu Handle is not connected to the DOM');
		};

		

		// basic primitive actions
		//

		
		let _hide = (menu)=>{
			menu[APP].state = core.key.CLOSED;
			menu[APP].behavior.closeMenu_method(menu);
		};
		let _show = (menu)=>{
			menu[APP].state = core.key.OPEN;
			menu[APP].behavior.openMenu_method(menu);
			instance.menuChain.push(menu);
		};
		let _leave = ()=>{
			instance.hoverItem?.[APP].behavior.leaveItem_method(instance.hoverItem);
			instance.hoverItem = null;
			instance.detainedItemReaction = null; // cancel detained item reactions
			check_delaySys_onLeaveItem();
		};
		let _hover = (item)=>{
			item[APP].behavior.hoverItem_method(item);
			instance.hoverItem = item;
		};

		let _outpath = (item)=>{
			item[APP].state = core.key.OUTPATH;
			item[APP].behavior.outpathItem_method(item);
		};
		let _inpath = (item)=>{
			item[APP].state = core.key.INPATH;
			item[APP].behavior.inpathItem_method(item);
		};

		let _setoff = (item)=>{
			item[APP].interact = core.key.UNUSABLE;
			item[APP].behavior.disableItem_method(item);
		};
		let _seton = (item)=>{
			item[APP].interact = core.key.USABLE;
			item[APP].behavior.enableItem_method(item);
		};




		// actions
		//

		let position_menu_process = ({menu, item}/*invocFrom*/)=>{
			let root = instance.get_root();
			let hook = instance.get_hook();
			// set position (main menu opening)
			if(menu && !item){
				let layer = menu[APP].layer;
				menu[APP].behavior.replaceLayer_method({hook, root, layer, menu});
			}
			// set position (submenu opening)
			if(!menu && item){
				menu = item[APP].content;
				let layer = menu[APP].layer;
				let upMenu = item[APP].inMenu;
				menu[APP].behavior.replaceLayer_method({hook, root, upMenu, item, layer, menu});
			}
			return menu;
		};

		let open_menu_process = (invocFrom)=>{
			
			const menu = position_menu_process(invocFrom);

			// show menu
			_show(menu);
		};

		// close submenus from a depth value
		let close_menu_process = function(newDepth){
			// TODO optimize with splice instead slice
			/* instance.menuChain.slice(newDepth+1).forEach(menu=>_hide(menu));
			instance.menuChain = instance.menuChain.slice(0,newDepth+1); */
			instance.menuChain.splice(newDepth+1).forEach(menu=>_hide(menu));
		};


		let update_itemPath_process = (newPath)=>{
			// disable highlighting of items, only if are not in newPath
			instance.itemPath.filter( item=>!newPath.includes(item) ).forEach( item=>_outpath(item) );
			// enable highlighting of items, only if are not in full_itemPath
			newPath.filter( item=>!instance.itemPath.includes(item) ).forEach( item=>_inpath(item) );
			// update full_itemPath data
			instance.itemPath = [...newPath];
		};








		// handle public features :
		//

		let connect_handle = (hook)=>{ // TODO do tests
			hook.appendChild(handle);
			usrHookElem = hook;
			if(!hook[APP]){
				hook[APP] = {};
				hook[APP].connectedCount = 0;
				init_elemUsrAccess(hook);
				set_elemRectSys(hook);
			}
			hook[APP].connectedCount++;
		};
		let disconnect_handle = ()=>{ // TODO do tests
			close_instance();
			let hook = usrHookElem;
			hook.removeChild(handle);
			hook[APP].connectedCount--;
			usrHookElem = null;
			if(hook[APP].connectedCount === 0){
				delete hook[APP];
				delete hook[uKey];
			}
		};


		let update_itemAvailability = (item)=>{
			let check = item[APP].check;
			// if there is check(), runs check() and gets result
			// if no check(), considers as available
			let available = check ? check(contextData) : true;

			if(available) _seton(item); else _setoff(item);

			return available;
		};
		let run_customUpdateProcess = (available, data, item)=>{
			item[APP].update?.(available, data, item);
		};

		let connect_usrContextData = (data)=>{
			contextData = data;
			instance.all_items.forEach(item=>{
				let available = update_itemAvailability(item);
				run_customUpdateProcess(available, data, item);
			});
		};
		let disconnect_usrContextData = ()=>{
			contextData = null;
		};


		let open_instance = ()=>{
			if(!instance.isOpen){
				instance.openSetup();
				let mainMenu = instance.get_mainMenu();
				open_menu_process({menu:mainMenu});
			}
		};

		let close_instance = ()=>{
			if(instance.isOpen){
				instance.closeSetup();
				let root = instance.get_root();
				// items
				update_itemPath_process(root[APP].itemPath);
				_leave();
				// menu
				close_menu_process(root[APP].depth);
				instance.hoverMenu = null;
			}
		};

		let update_subRects = (menu, submenuOnly/*bool*/)=>{
			if(submenuOnly)
				menu[APP].items.forEach(item=>item[APP].contentType===core.key.SUBMENU?item[APP].rect.update():null);
			else
				menu[APP].items.forEach(item=>item[APP].rect.update());
		};

		let update_layerPosition = (menu)=>{
			if(menu === instance.get_mainMenu())
				position_menu_process({menu:menu});
			else{
				const item = menu[APP].itemPath.at(-1);
				position_menu_process({item:item});
			}
		};


		let control_unfoldUntil = (menu)=>{
			if(instance.isOpen){
				// open menus
				menu[APP].itemPath.forEach(item=>{
					let submenu = item[APP].content;
					if(submenu[APP].state===core.key.CLOSED)
						open_menu_process({item:submenu[APP].itemPath.at(-1)})
				});

				// highlight items until menu
				update_itemPath_process(menu[APP].itemPath);
			}
		};

		let control_foldUntil = (menu)=>{
			if(instance.isOpen){
				// highlight items until menu
				update_itemPath_process(menu[APP].itemPath);
				// close menus
				close_menu_process(menu[APP].depth);
			}
		};


		let control_setHover = (item)=>{
			if(instance.isOpen){
				if(item !== instance.hoverItem){
					instance.hoverMenu = item[APP].inMenu;
					_leave();
					_hover(item);
				}
			}
		};
		let control_setLeave = ()=>{
			if(instance.isOpen){
				instance.hoverMenu = null;
				_leave();
			}
		};


		let send_mouseover = (item)=>{
			if(instance.isOpen){
				item_mouseover(item);
			}
		};



		// root events :
		//

		let menu_mouseover = (menu)=>{

			_leave(); // leave current item

			instance.hoverMenu = menu;

			update_itemPath_process(instance.menuChain.at(-1)[APP].itemPath);
		};

		let get_contentStatus = (item)=>{
			let open = false, submenu = false;
			if(item[APP].contentType === core.key.SUBMENU){
				submenu = true;
				if(item[APP].content[APP].state === core.key.OPEN)
					open = true;
			}
			return {alreadyOpen:open, containsMenu:submenu};
		};

		let item_mouseover = (item)=>{
			if(instance.hoverItem !== item){
				
				_leave(); // leave previous hover item
				instance.hoverMenu = item[APP].inMenu;
				update_itemPath_process(item[APP].itemPath);

				let {alreadyOpen, containsMenu} = get_contentStatus(item);

				close_menu_process(item[APP].depth + (alreadyOpen ? 1 : 0));

				// if available
				if(item[APP].interact === core.key.USABLE){
	
					// hover current item
					let reaction = ()=>_hover(item); // ORIGINALLY : _hover(item);
					catch_itemReaction(item, reaction, 'hoveritself')?.();
	
					// content : submenu case
					if(containsMenu && !alreadyOpen){
						reaction = ()=>open_menu_process({item:item}); // ORIGINALLY : open_menu_process({item:item});
						catch_itemReaction(item, reaction, 'opensubmenu')?.();
					}
				}
			}
			console.log('item_mouseover');
		};

		let check_delaySys_onLeaveItem = ()=>{
			if(instance.clear_lateProcessOnLeaveItem) clearTimeout(instance.lastLateProcessID);
		};

		let item_mouseover_foldableOnDelay = (item)=>{
			if(instance.hoverItem !== item){
				
				// normal process
				//

				_leave(); // leave previous hover item
				instance.hoverMenu = item[APP].inMenu;
				update_itemPath_process(item[APP].itemPath);

				let reaction = null;
				if(item[APP].interact === core.key.USABLE){
					// hover current item
					reaction = ()=>_hover(item); // ORIGINALLY : _hover(item);
					catch_itemReaction(item, reaction, 'hoveritself')?.();
				}

				reaction = ()=>{
					let {alreadyOpen, containsMenu} = get_contentStatus(item);
	
					close_menu_process(item[APP].depth + (alreadyOpen ? 1 : 0));
	
					// if available
					if(item[APP].interact === core.key.USABLE){
						// content : submenu case
						if(containsMenu && !alreadyOpen){
							reaction = ()=>open_menu_process({item:item}); // ORIGINALLY : open_menu_process({item:item});
							catch_itemReaction(item, reaction, 'opensubmenu')?.();
						}
					}
				};

				// delay system
				//
				const delay = instance.foldableDelay;
				if(instance.merge_delaySysWithItemReaction){ // mix delaySys witn itemReaction (expert mode)
					catch_itemReaction(item, reaction, 'delaysystem');//?.(); // cannot be refused
					instance.lastLateProcessID = setTimeout(()=>release_itemReactions(item), delay);
				}else{ // delaySys works as independant (normal mode)
					instance.lastLateProcessID = setTimeout(()=>reaction(), delay);
				}

			}
			console.log('item_mouseover_delay');
		};

		// parse ancestor and return the first parent having sccm prop as MAINELEM value.
		// if doesn't find, stop to 'root' elem and return it.
		let get_menuAncestorElem = function(elem){
			let root = instance.get_root();
			while(elem !== root){
				if(elem[APP]?.sccm === core.key.MAINELEM)
					return elem;
				elem = elem.parentElement;
			}
			return root;
		};

		// mousemouve EVENT
		let root_mouseover = (e)=>{
			console.log('root_mouseover');
			if(instance.isOpen){
				// for Chrome  : e.toElement 
				// for Firefox : e.target
				// for Firefox : e.explicitOriginalTarget (enter closed shadow root)
				// for Any?    : e.composedPath().shift() // needs to be tested
				let fromElem = e.toElement || e.target;
				let elem = get_menuAncestorElem(fromElem);
				if(elem[APP].type === core.key.MENU) menu_mouseover(elem);
				if(elem[APP].type === core.key.ITEM){
					if(instance.foldableDelay)
						item_mouseover_foldableOnDelay(elem);
					else
						item_mouseover(elem);
				}
			}
		};

		// mouseleave EVENT
		let root_mouseleave = (e)=>{
			console.log('root_leave');
			if(instance.isOpen){
				_leave(); // leave current item
				instance.hoverMenu = null;
			}
		};

		let run_itemFeatureProcess = (item, args, forced)=>{
			// in all case, args contains : contextData
			// in std click case, args contains : + allowedEventProps (alt 1)
			// in user handle call case, args contains : + [uKey]     (alt 2)
			if(item)
			if(item[APP].interact === core.key.USABLE || forced)
			if(item[APP].contentType === core.key.FEATURE)
				item[APP].content({...args, item, forced});
		};

		// click EVENT
		let root_click = (e)=>{
			console.log('root_click', e);
			if(instance.isOpen)
			if(instance.stdClickEnable){
				let {buttons, shiftKey, ctrlKey, altKey} = e;
				let allowedEventProps = {buttons, shiftKey, ctrlKey, altKey};
				run_itemFeatureProcess(instance.hoverItem, {contextData, allowedEventProps}, false);
			}
		};


		// html building part
		////////////////////////////////////////////////////////


		// public access
		//

		let init_elemUsrAccess = (elem)=>{
			elem[uKey] = {};
		};



		// handle
		//

		let make_shadowDOM = ()=>{
			let handle = document.createElement('DIV');
				handle.style.width = 0;
				handle.style.height = 0;
				handle.style.whiteSpace = 'nowrap';
				handle.style.display = 'inline-block';
				handle.style.position = 'relative';

			let container = handle.attachShadow({mode:'closed'});
			//let container = handle.attachShadow({mode:'open'}); // debug (as test)

			return {handle, container};
		};

		let build_handleWithShadow = ()=>{
			let {handle, container} = make_shadowDOM();

			handle[APP] = {};
			handle[APP].container = container;

			init_elemUsrAccess(handle);

			// PUBLIC FEATURES :
			// - does check tests
			// - protects 'this' var
			// - exports in user access
			handle[uKey].get_menu = (id)=>{
				// NO CHECK
				return instance.all_menus.find(menu=>menu[APP].id===id);
			};
			handle[uKey].get_menus = ()=>{
				// NO CHECK
				return [...instance.all_menus];
			};
			handle[uKey].get_item = (id)=>{
				// NO CHECK
				return instance.all_items.find(item=>item[APP].id===id);
			};
			handle[uKey].get_items = ()=>{
				// NO CHECK
				return [...instance.all_items];
			};
			handle[uKey].get_layers = ()=>{
				// NO CHECK
				return instance.all_menus.map(menu=>menu[APP].layer);
			};
			handle[uKey].get_root = ()=>{
				// NO CHECK
				return instance.get_root();
			};
			handle[uKey].get_chainLength = ()=>{
				// NO CHECK
				return instance.menuChain.length;
			};
			handle[uKey].get_menuChain = ()=>{
				// NO CHECK
				return [...instance.menuChain];
			};
			handle[uKey].get_itemPath = ()=>{
				// NO CHECK
				return [...instance.itemPath];
			};
			handle[uKey].get_maxDepth = ()=>{
				// NO CHECK
				return instance.maxDepth;
			};

			handle[uKey].set_itemFoldableReactionDelay = (milliseconds)=>{
				// NO CHECK
				instance.foldableDelay = milliseconds;
			};
			handle[uKey].cancel_parallelDelayedReactions = (bool)=>{
				// NO CHECK
				instance.clear_lateProcessOnLeaveItem = bool;
			};
			handle[uKey].fusion_delaysThroughItemReactSys = (bool)=>{
				// NO CHECK
				instance.merge_delaySysWithItemReaction = bool;
			};

			handle[uKey].set_clickEnable = (bool)=>{
				// NO CHECK
				instance.stdClickEnable = bool;
			};
			handle[uKey].get_hoverElems = ()=>{
				check_handleOpen();
				return {menu:instance.hoverMenu, item:instance.hoverItem};
			};
			handle[uKey].run_hoverItemFeature = (args)=>{
				check_handleOpen();
				run_itemFeatureProcess(instance.hoverItem, {contextData, [uKey]:args}, false);
			};
			handle[uKey].run_itemFeature = (item, args, forced)=>{
				// NO CHECK
				run_itemFeatureProcess(item, {contextData, [uKey]:args}, forced);
			};
			handle[uKey].unfold_untilMenu = (menu)=>{
				// OWN CHECK
				control_unfoldUntil(menu);
			};
			handle[uKey].fold_untilMenu = (menu)=>{
				// OWN CHECK
				control_foldUntil(menu);
			};
			handle[uKey].set_hoverItem = (item)=>{
				// OWN CHECK
				control_setHover(item);
			};
			handle[uKey].remove_hoverItem = ()=>{
				// OWN CHECK
				control_setLeave();
			};
			handle[uKey].simulate_hoverItem = (item)=>{
				// OWN CHECK
				send_mouseover(item);
			};

			handle[uKey].add_style = (cssClassTxt)=>{
				// NO CHECK
				usrStyle.textContent += cssClassTxt;
			};
			handle[uKey].set_style = (cssClassTxt)=>{
				// NO CHECK
				usrStyle.textContent = cssClassTxt;
			};
			
			handle[uKey].set_parent = (parent)=>{
				// NO CHECK
				connect_handle(parent);
			};
			handle[uKey].remove_parent = ()=>{
				check_handleConnexion();
				disconnect_handle();
			};

			handle[uKey].open = ()=>{
				check_handleConnexion();
				open_instance();
			};
			handle[uKey].close = ()=>{
				check_handleConnexion();
				close_instance();
			};
			handle[uKey].isOpen = ()=>{
				check_handleConnexion();
				return instance.isOpen;
			};
			handle[uKey].update_chainItemRects = ()=>{
				// OWN CHECK
				instance.menuChain.forEach( menu=>update_subRects(menu, true) );
			};
			handle[uKey].update_chainLayers = ()=>{
				// OWN CHECK
				instance.menuChain.forEach( menu=>update_layerPosition(menu) );
			};

			handle[uKey].set_contextData = (data)=>{
				// NO CHECK
				connect_usrContextData(data);
			};
			handle[uKey].remove_contextData = ()=>{
				// NO CHECK
				disconnect_usrContextData();
			};

			return handle;
		};





		// base of all sccm elems (root/layer/menu/item)
		//

		let make_sccmElem = ()=>{
			let elem = document.createElement('DIV');
				// sccm base properties
				elem[APP] = {};
			return elem;
		};
		
		let set_elemRectSys = (elem)=>{
			elem[APP].rect = make_itselfRectSys(elem);

			// PUBLIC FEATURES :
			// - does check tests
			// - protects 'this' var
			// - exports in user access
			elem[uKey].update_rect = ()=>{
				check_handleConnexion();
				elem[APP].rect.update();                 return elem[uKey]; // CHAINABLE
			};
			elem[uKey].get_rect = ()=>{
				check_handleConnexion();
				return elem[APP].rect.get_copy();
			};
			elem[uKey].set_rectWithBorder = (bool)=>{
				check_handleConnexion();
				elem[APP].rect.set_borderRect(bool);
			};
			elem[uKey].round_rect = ()=>{
				check_handleConnexion();
				elem[APP].rect.round();                  return elem[uKey]; // CHAINABLE
			};
		};

		const store_usrInits = (elem, type, init)=>{ // type : root/layer/menu/item (str)
			// using : store_usrInits(elem, 'root'|'layer'|'menu'|'item', init)
			elem[APP].run_inits = ()=>{
				mainInit[type](elem);
				init?.(elem);
			};
		}; // TODO : ready, waiting for implementation and tests
			


		// root
		//

		let reset_rootCoreProps = (elem)=>{
			elem[APP].sccm = core.key.AREAELEM;
			elem[APP].type = core.key.ROOT;

			elem[APP].depth = -1;
			elem[APP].itemPath = [];
		};

		let make_sccm_root = ()=>{
			let elem = make_sccmElem();
			// core setup
			reset_rootCoreProps(elem);

			// [public accesses] export (before [public inits] exec)
			//

			// core (rect)
			init_elemUsrAccess(elem);
			set_elemRectSys(elem);

			// [public inits] exec (now)
			//

			// elem init (css/html usr process)
			//mainInit.root(elem);
			store_usrInits(elem, 'root');
			
			// [last step for root] process
			//

			elem.addEventListener('mouseover',root_mouseover);
			elem.addEventListener('mouseleave',root_mouseleave);
			elem.addEventListener('click',root_click);

			return elem;
		};





		// layer
		//

		let reset_layerCoreProps = (elem)=>{
			elem[APP].sccm = core.key.AREAELEM;
			elem[APP].type = core.key.LAYER;
		};

		let make_sccm_layer = (menu, init)=>{
			let elem = make_sccmElem();
			// core setup
			reset_layerCoreProps(elem);

			// [public accesses] export (before [public inits] exec)
			//

			// core (rect)
			init_elemUsrAccess(elem);
			set_elemRectSys(elem);

			// [public inits] exec (now)
			//
			
			// elem init (css/html usr process)
			//mainInit.layer(elem); init?.(elem);
			store_usrInits(elem, 'layer', init);

			// [last step for layer] process
			//

			elem.appendChild(menu);

			return elem;
		};





		// main elem (menu/item) settings
		//

		let set_elemBehaviorSys = (elem, ownBehavior)=>{
			elem[APP].behavior = {...mainBehavior, ...(ownBehavior||{}),};
			elem[uKey].behavior = {};
			// PUBLIC FEATURES :
			// - does check tests
			// - protects 'this' var
			// - exports in user access
			elem[uKey].behavior.set_method = (name,process)=>{
				// NO CHECK
				elem[APP].behavior[name] = process;
			};
			elem[uKey].behavior.inherite_from = (inherited)=>{
				// NO CHECK
				let current = elem[APP].behavior;
				elem[APP].behavior = {...current, ...inherited}; // 'inherited' gets priority
			};
		};





		// menu
		//

		let set_menuElemsAccess = (elem)=>{
			// PUBLIC FEATURES :
			// - does check tests
			// - protects 'this' var
			// - exports in user access
			elem[uKey].elems = {
				// NO CHECK
				//
				get_hook : ()=>instance.get_hook(),
				get_root : ()=>instance.get_root(),
				get_main : ()=>instance.get_mainMenu(),
				get_chainLength : ()=>instance.menuChain.length,
				get_menuChain : ()=>[...instance.menuChain],
				get_itemPath : ()=>[...instance.itemPath],
				get_depth : ()=>elem[APP].depth,
				get_maxDepth : ()=>instance.maxDepth,
				get_itsItemPath : ()=>[...elem[APP].itemPath],
				get_itsMenuChain : ()=>instance.menuChain.slice(0, elem[APP].depth+1),
				get_upItem : ()=>elem[APP].itemPath.at(-1)||null,
				get_upMenu : ()=>elem[APP].itemPath.at(-1)?.[APP].inMenu,
				get_layer : ()=>elem[APP].layer,
				get_items : ()=>[...elem[APP].items],
				update_itemRects : (submenuOnly=true)=>update_subRects(elem, submenuOnly),
				update_layerPos : ()=>update_layerPosition(elem),
				is_main : ()=>!elem[APP].depth,
				is_sub : ()=>!!elem[APP].depth,
				close_submenus : ()=>control_foldUntil(elem),
			};
		};

		let set_menuPropSetters = (elem)=>{
			// PUBLIC FEATURES :
			// - does check tests
			// - protects 'this' var
			// - exports in user access
			elem[uKey].propSetters = {
				// NO CHECK
				set_id(id){ elem[APP].id = id; },
			};
		};

		let reset_menuCoreProps = (elem)=>{
			elem[APP].sccm = core.key.MAINELEM;
			elem[APP].type = core.key.MENU;
			elem[APP].state = core.key.CLOSED;
		};

		let make_sccm_menu = (init, behavior, layerInit)=>{
			let elem = make_sccmElem();
			// core setup
			reset_menuCoreProps(elem);
			
			// [public accesses] export (before [public inits] exec)
			//

			// core (behavior and rect)
			init_elemUsrAccess(elem);
			set_elemRectSys(elem);
			set_elemBehaviorSys(elem, behavior);
			// user prop setters
			set_menuPropSetters(elem);
			// user linked elem access (getters/updaters)
			set_menuElemsAccess(elem);

			// [public inits] exec (now)
			//

			// elem init (css/html usr process)
			//mainInit.menu(elem); init?.(elem);
			store_usrInits(elem, 'menu', init);

			// [last step for menu] process
			//

			// add layer
			elem[APP].layer = make_sccm_layer(elem, layerInit);

			return elem;

		};



		// item
		//

		let catch_itemReaction = (item, scopedReaction, reactionType)=>{

			let willCatch = (reactionType === 'delaysystem');

			if(item[APP].pointer === core.key.BUSYLOCK)
			if(item[APP].locking[reactionType]) // 'opensubmenu' || 'hoveritself'
				willCatch = true;
			
			if(willCatch){ 
				// if no previous item already catched
				// or if previous catched item is not current item
				if(instance.detainedItemReaction?.item !== item)
					instance.detainedItemReaction = {item, reactionStack:[]};
				
				instance.detainedItemReaction.reactionStack.push(scopedReaction);
				return null; // success reaction catching
			}

			// fail reaction catching : return original reaction
			return scopedReaction;
		};

		let release_itemReactions = (item)=>{
			if(instance.detainedItemReaction?.item === item){
				instance.detainedItemReaction.reactionStack.forEach( f=>f() );
				instance.detainedItemReaction = null
			}	
		};

		let set_itemLockingSetters = (elem)=>{
			elem[APP].locking = {
				opensubmenu : false,
				hoveritself : false,
			};
			// PUBLIC FEATURES :
			// - does check tests
			// - protects 'this' var
			// - exports in user access
			elem[uKey].locking = {
				// NO CHECK
				//
				set_opensubmenu(bool){ elem[APP].locking.opensubmenu = bool; },
				set_hoveritself(bool){ elem[APP].locking.hoveritself = bool; },
				lock_reaction()      { elem[APP].pointer = core.key.BUSYLOCK; },
				unlock_reaction()    { elem[APP].pointer = core.key.READYNOW; release(elem); },
			};
			const release = release_itemReactions;
		};

		let set_itemElemsAccess = (elem)=>{
			// PUBLIC FEATURES :
			// - does check tests
			// - protects 'this' var
			// - exports in user access
			elem[uKey].elems = {
				// NO CHECK
				//
				get_hook : ()=>instance.get_hook(),
				get_root : ()=>instance.get_root(),
				get_menu : ()=>elem[APP].inMenu,
				get_submenu : ()=>elem[APP].contentType===core.key.SUBMENU ? elem[APP].content : null,
			};
		};

		let set_itemPropSetters = (elem)=>{
			// PUBLIC FEATURES :
			// - does check tests
			// - protects 'this' var
			// - exports in user access
			elem[uKey].propSetters = {
				// NO CHECK
				//
				set_txt(txt)      { elem.innerHTML = txt; },
				set_id(id)        { elem[APP].id = id; },
				set_check(check)  { elem[APP].check = check; },
				set_update(update){ elem[APP].update = update; },
			};
		};

		let reset_itemCoreProps = (elem)=>{
			elem[APP].sccm = core.key.MAINELEM;
			elem[APP].type = core.key.ITEM;
			elem[APP].state = core.key.OUTPATH;
			elem[APP].pointer = core.key.READYNOW;
			elem[APP].interact = core.key.USABLE;
		};

		let make_sccm_item = (init, behavior)=>{
			let elem = make_sccmElem();
			// core setup
			reset_itemCoreProps(elem);

			// [public accesses] export (before [public inits] exec)
			//

			// core (behavior and rect)
			init_elemUsrAccess(elem);
			set_elemRectSys(elem);
			set_elemBehaviorSys(elem, behavior);
			// user prop setters
			set_itemPropSetters(elem);
			// user linked elem access (getters/updaters)
			set_itemElemsAccess(elem);
			// user lock reation setters
			set_itemLockingSetters(elem);

			// [public inits] exec (now)
			//

			// elem init (css/html usr process)
			//mainInit.item(elem); init?.(elem);
			store_usrInits(elem, 'item', init);

			// [last step for item] process
			//

			// nothing special

			return elem;
		};



		
		// returns : a menu for recursive process. (return has no importance)
		// it will mainly affect vars in parent scope : instance and root.
		// arg menuRef : is the user template (full or subpart)
		// arg isMain : must be true on first recursive loop
		// arg chainElem : first elem owning {depth, itemPath}
		let builder = (menuRef, isMain, chainElem)=>{
			let {all_menus, all_items} = instance;

			// MENU
			//
			let {settings:{id, init ,behavior, layerInit}} = menuRef

			let menu = make_sccm_menu(init ,behavior, layerInit);

			menu[APP].behavior.setClosedMenu_method(menu);

			menu[APP].id = id;

			menu[APP].depth = chainElem[APP].depth + 1;
			menu[APP].itemPath = [...chainElem[APP].itemPath];
			instance.update_maxDepth( menu[APP].depth );

			menu[APP].items = [];

			let root = instance.get_root();
			root.appendChild(menu[APP].layer);

			all_menus.push(menu);

			// ITEMS
			// 
			(menuRef.items || []).forEach(itemRef=>{

				let {settings:{id, txt='', check, update, init ,behavior}, content} = itemRef;

				let item = make_sccm_item(init ,behavior);

				item.innerHTML = txt;
				item[APP].id = id;
				item[APP].check = check;
				item[APP].update = update;

				item[APP].inMenu = menu;
				item[APP].depth = menu[APP].depth;
				item[APP].itemPath = [...menu[APP].itemPath, item];

				// feature
				if(typeof content === 'function'){
					item[APP].contentType = core.key.FEATURE;
					item[APP].content = content;
				}
				// submenu
				else{
					item[APP].contentType = core.key.SUBMENU;
					let submenu = builder(content, false, item);
					item[APP].content = submenu;
				}

				menu[APP].items.push(item);
				menu.appendChild(item);
				all_items.push(item);
			});

			// clean itemPath of items (removes item itself in its itemPath)
			if(isMain)
				all_items.forEach(item=>item[APP].itemPath.pop());
			else
				return menu;
		};

		// build execution
		//

		const APP = core.key.PRIV_MEM;
		const uKey = usrMemKey;


		// default theme (instance structure : menus/items/etc)
		core.theme.sccmOriginal.default.set(uKey);
		const { 
			css      : default_css,
			initELEM : defaultInit,
			behavior : defaultBehavior,
		} = core.theme.sccmOriginal.default.get();

		// default theme (main menu only)
		core.theme.sccmOriginal.defaultMain.set(uKey);
		const { 
			css      : defMain_css,
			initELEM : defMainInit,
			behavior : defMainBehav,
		} = core.theme.sccmOriginal.defaultMain.get();

		// check user default main menu theme. (add sccm default main menu theme if user did not set it)
		usrTemplate.mainMenu.settings = {
			init:defMainInit.menu, behavior:defMainBehav, ...usrTemplate.mainMenu.settings
		};

		// get final theme (sccm default OR from user)
		const mainInit = {...defaultInit, ...(usrTemplate.settings?.initELEM||{})};
		const mainBehavior = {...defaultBehavior, ...(usrTemplate.settings?.behavior||{})};
		const mainCSS = usrTemplate.settings?.css || (default_css+defMain_css);

		// sccm instance (definition)
		let instance = {
			isOpen : false,

			hoverMenu : null,
			hoverItem : null,

			menuChain : [],
			itemPath  : [],
			maxDepth  : -1,

			all_menus : [],
			all_items : [],

			openSetup(){
				this.isOpen = true;
				this.hoverMenu = null;
				this.hoverItem = null;
				this.menuChain = [];
				this.itemPath = [];
			},

			closeSetup(){ this.isOpen = false; },

			update_maxDepth(value){ this.maxDepth=Math.max(this.maxDepth,value); },

			get_hook   : ()=>usrHookElem,
			get_handle : ()=>handle,
			get_root   : ()=>root,

			get_mainMenu(){ return this.all_menus[0]; },
		};

		instance.detainedItemReaction = null; // format : {item,reactionStack[function,...]}
		instance.lastLateProcessID = null;

		// sccm instance (default config)
		instance.foldableDelay = 100; // also considerated as flag : false if === 0 , true if > 0
		instance.merge_delaySysWithItemReaction = false; // usr can release delaySys but delaySys will release itemReaction at every delaySys' release
		instance.clear_lateProcessOnLeaveItem = true;
		instance.stdClickEnable = true;

		// sccm Context Data object
		let contextData = null;

		// support elems
		let usrHookElem = null;
		let handle = build_handleWithShadow();
		let container = handle[APP].container;
		let root = make_sccm_root();

		// sccm elems
		builder(usrTemplate.mainMenu, true, root);

		// sccm css
		let usrStyle = document.createElement('STYLE');
		usrStyle.textContent = mainCSS;

		// support connexion
		container.appendChild(usrStyle);
		container.appendChild(root);

		// runs user inits
		root[APP].run_inits(); // root
		instance.all_menus.forEach(menu=>{
			menu[APP].layer[APP].run_inits(); // layers
			menu[APP].run_inits(); // menus
		});
		instance.all_items.forEach( item=>item[APP].run_inits() ); // items


		// debug global vars TODO remove it
		DEBUG = {instance};


		return handle;
	};

	// MAKES PUBLIC FEATURE :
	// - does no check tests
	// - protects 'this' var
	// - export to main api
	let create_menuStructure = (usrTemplate, usrMemKey)=>{
		// OWN CHECK
		return core.create_menuStructure(usrTemplate, usrMemKey); // protect 'this'
	};
	SCCM.create_menu = create_menuStructure; // export feature


	


})(SuperCustomContextMenu);