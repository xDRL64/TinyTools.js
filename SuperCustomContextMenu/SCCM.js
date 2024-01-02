let SuperCustomContextMenu = {}; // API Receiver

((SCCM)=>{ // API Exporter


	let core = {};

	core.theme_key = Symbol("THEME PRIVATE MEMORY");


	//core.atNextLoop = (callback,time)=>setTimeout(callback,time??1); // use time arg in debug case
	// setTimeout TOOOOOOOOOOOOO MUCH RANDOM !

	/* core.atNextLoop = function(callback){
		requestAnimationFrame( (()=>requestAnimationFrame(callback)) );
	}; */

	core.atNextLoop = function(callback){
		requestAnimationFrame( callback );
	};



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
			dst_elem.className = src_init.class;
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

		const sdtCheckOverflow__ = ()=>core.preventOverflowLib.presets.standard; // later lib available
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



		// TODO segment behavior in _behav

		// THEME TEMPLATE BASES
		//

		
		// base and baseMain

		const _base = { // minimal base :: +[style.prtEvt/display], *[behav.all]
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
					position : 'absolute',  // \
					width : 'fit-content',  // | together
					height : 'fit-content', // /
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

		const _baseMain_part = { // baseMain settings :: *[behav.replace]
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

		const _base_cssOffset_ = (sympetricPadding, symetricBorder, totalOffset)=>({
			// args : css expression/value (accepts units and functions)
			// MUST HAVE AT LEAST ALL TYPES (_all/root/layer/menu/item/behaviors) EVENT IF ARE EMPTY
			_all  : {
				
			},
			root  : {
				class : ['sccmRoot'],
				css : '\n'
				    + '/* _base_cssOffset_ (_all) */\n'
				    + '.sccmRoot{'
				    + `  --padding : ${sympetricPadding||'0px'};`
					+ `  --border : ${symetricBorder||'0px'};`
					+ `  --posOfst : ${totalOffset||'0px'};`
					+ `  --negOfst : calc(${totalOffset||'0px'} * -1);`
				    + '}\n'
			},
			layer : {},
			menu  : {},
			item  : {},
			behaviors : {},
		});

		// class

		const withClass_part = { // class settings :: +[class.menu/item], *[behav.all-replace]
			// contains only differences from its base
			menu : {
				class : ['menu'],
			},
			item : {
				class : ['item'],
			},
			behaviors : {
				// binders
				//
				openMenu_method : (uKey)=>{
					return (menu)=>{
						menu.classList.remove('closed');
						menu[uKey].elems.update_itemRects();
					};
				},
				closeMenu_method : (uKey)=>{
					return (menu)=>{
						menu.classList.add('closed');
					};
				},
				setClosedMenu_method : (uKey)=>{
					return (menu)=>{
						menu.classList.add('closed');
					};
				},
				hoverItem_method : (uKey)=>{
					return (item)=>{
						item.classList.add('hovered');
					};
				},
				leaveItem_method : (uKey)=>{
					return (item)=>{
						item.classList.remove('hovered');
					};
				},
				inpathItem_method : (uKey)=>{
					return (item)=>{
						item.classList.add('inPath');
					};
				},
				outpathItem_method : (uKey)=>{
					return (item)=>{
						item.classList.remove('inPath');
					};
				},
				disableItem_method : (uKey)=>{
					return (item)=>{
						item.classList.add('notAvailable');
					};
				},
				enableItem_method : (uKey)=>{
					return (item)=>{
						item.classList.remove('notAvailable');
					};
				},

				// replaceLayer_method // not overwrote
			},
		};

		const class_ptrLogic_part = { // class use prtEvt :: +[css.menu.auto/css.closed.none]
			// contains only differences from its base
			menu : {
				css : '\n'
				    + '/* class_ptrLogic_part */\n'
				    + '.menu{'
				    + '  pointer-events : auto;'
				    + '}\n'
				    + '.closed{'
				    + '  pointer-events : none;'
				    + '}\n',
			},
		};

		const class_displayLogic_part = { // class use opacity :: +[css.menu.opa:1/css.menu.clo.opa:0]
			// contains only differences from its base
			menu : {
				css : '\n'
				    + '/* class_displayLogic_part */\n'
				    + '.menu{'
				    + '  opacity : 1;'
				    + '}\n'
				    + '.closed{'
				    + '  opacity : 0;'
				    + '}\n',
			},
		};

		const expendClass_part = { // add class open :: *[behav.open/close/setclose]
			// contains only differences from its base
			behaviors : {
				
				// binders
				//
				openMenu_method : (uKey)=>{
					return (menu)=>{
						menu.classList.add('open');
						menu.classList.remove('closed');
						menu[uKey].elems.update_itemRects();
					};
				},
				closeMenu_method : (uKey)=>{
					return (menu)=>{
						menu.classList.add('closed');
						menu.classList.remove('open');
					};
				},
				setClosedMenu_method : (uKey)=>{
					return (menu)=>{
						menu.classList.add('closed');
						menu.classList.remove('open');
					};
				},

			},
		};

		// classMain

		const mainMenuClass_part = { // add class main :: +[class.menu.main]
			menu : {
				class : ['main'],
			},
		};

		// baisc position

		const foldRight_part = (offset='0px')=>({ // set submenu position :: +[style.menu.left:100%+offset]
			// contains only differences from its base
			menu : {
				style : {
					left : `calc(100% + ${offset})`,
				},
			},
		});
		
		// basic position main

		const openRight_part = { // set main menu position :: +[style.menu.left:'']
			// contains only differences from its base
			menu : {
				style : {
					left : '', // TODO test with '0%' instead
				},
			},
		};

		// advanced position (main and sub)

		const sdtFold_additional_inits = { // add smart positioning :: +[init.root.LR/DT]
			// everything optional (root/layer/menu/item)
			root : (root, uKey)=>{
				sdtCheckOverflow__().RIGHTLEFT.init(root);
				sdtCheckOverflow__().DOWNTOP.init(root);
			},
		};

		const stdFold_checkOnly = (menu, uKey, symetricOffset='0px')=>{  // :: left/top
			// use it in an openMenu_method
			const ofst = symetricOffset;
			const hrzOfst = {
				//mainMenu:{RIGHT:'0%',LEFT:'0%'},
				subMenu:{RIGHT:`${ofst}`,LEFT:`-${ofst}`} // equal to padding
			}
			const RL_result = sdtCheckOverflow__().RIGHTLEFT.process(menu, uKey, hrzOfst);

			const vrtOfst = {
				//mainMenu:{DOWN:'0%',TOP:'0%'},
				subMenu:{DOWN:`-${ofst}`,TOP:`${ofst}`}, // equal to padding
			};
			const DT_result = sdtCheckOverflow__().DOWNTOP.process(menu, uKey, vrtOfst);
	
			return {RL_result, DT_result};
		};

		const stdFold_process = (menu, uKey, symetricOffset='0px')=>{  // :: left/top
			// use it in an openMenu_method
			const {RL_result,DT_result} = stdFold_checkOnly(menu, uKey, symetricOffset);
			if(RL_result.status) RL_result._apply();
			if(DT_result.status) DT_result._apply();
		};

		const stdFold_processWithTransition = (menu, uKey, symetricOffset='0px')=>{  // :: left/top
			// use it in an openMenu_method
			const original_transition_value = menu.style.transition;
			menu.style.transition = '';
			const {RL_result,DT_result} = stdFold_checkOnly(menu, uKey, symetricOffset);
			menu.style.transition = original_transition_value;
			const _apply = ()=>{
				if(RL_result.status) RL_result._apply();
				if(DT_result.status) DT_result._apply();
			};
			core.atNextLoop(_apply);
		};
		
		const stdFoldUsingClass_process = (menu, uKey, symetricOffset='0px')=>{  // :: left/top/translate
			// use it in an openMenu_method
			menu.classList.remove('RIGHT', 'LEFT', 'DOWN', 'TOP');

			const {RL_result,DT_result} = stdFold_checkOnly(menu, uKey, symetricOffset);

			if(RL_result.status) menu.classList.add(RL_result.sideName);
			if(DT_result.status) menu.classList.add(DT_result.sideName);

		};

		const stdFoldUsingClass_processWithTransition = (menu, uKey, symetricOffset='0px')=>{  // :: left/top/translate
			// use it in an openMenu_method
			menu.classList.remove('RIGHT', 'LEFT', 'DOWN', 'TOP');
			const original_transition_value = menu.style.transition;
			menu.style.transition = '';
			const {RL_result,DT_result} = stdFold_checkOnly(menu, uKey, symetricOffset);
			menu.style.transition = original_transition_value;
			const _apply = ()=>{
				if(RL_result.status) menu.classList.add(RL_result.sideName);
				if(DT_result.status) menu.classList.add(DT_result.sideName);
				menu.classList.remove('closed'); // TODO find better way to do it
			};
			core.atNextLoop(_apply);
		};

		const stdFoldUsingClassStartPos_process = (menu, uKey, symetricOffset='0px')=>{  // :: left/top/translate
			// use it in an openMenu_method

			const closing =true// menu.classList.contains('closing');
			const closed = !closing;
	
			if(closed){ // from closed state : apply class will start tansition
				menu.classList.remove('_RIGHT', '_LEFT', '_DOWN', '_TOP');
				const original_transition_value = menu.style.transition;
				menu.style.transition = 'none';
				const {RL_result,DT_result} = stdFold_checkOnly(menu, uKey, symetricOffset);
				if(RL_result.status) menu.classList.add('_'+RL_result.sideName);
				if(DT_result.status) menu.classList.add('_'+DT_result.sideName);
				//menu.classList.add('closed');
				const _apply = ()=>{
					menu.style.transition = original_transition_value;
					menu.classList.remove('closed');
					if(RL_result.status) menu.classList.add(RL_result.sideName);
					if(DT_result.status) menu.classList.add(DT_result.sideName);
				};
				core.atNextLoop(_apply);
			}
			if(closing){ // from closing state : preserves current running transition
				//menu.classList.remove('closing');
				const propList = ['left','right',...menu[TMEM].stdFold_transitionProps];
				let styles = getComputedStyle(menu);
				styles = propList.reduce((acc,cur)=>{acc[cur]=styles[cur];return acc;},{});
				menu.classList.remove('_RIGHT', '_LEFT', '_DOWN', '_TOP');
				const original_transition_value = menu.style.transition;
				menu.style.transition = 'none';
				const {RL_result,DT_result} = stdFold_checkOnly(menu, uKey, symetricOffset);
				if(RL_result.status){
					menu.classList.add('_'+RL_result.sideName);
					menu.classList.add(RL_result.sideName);
				}
				if(DT_result.status){
					menu.classList.add('_'+DT_result.sideName);
					menu.classList.add(DT_result.sideName);
				}

				let directStyle = propList;
				directStyle.forEach(prop=>menu.style[prop]=styles[prop]);


				const removeDirectStyle = ()=>{
					menu.style.transition = original_transition_value;
					menu.classList.remove('closed');
					directStyle.forEach(prop=>menu.style[prop]='');
				};
				core.atNextLoop(removeDirectStyle);

				// 
			}
		};

		const class_stdFold_part = {
			// left/top % relative to parent (layer) // translate % relative to menu itself
			menu : {
				css : '\n'
					+ '/* class_stdFold_part */\n'

					// main by axes
					+ '.main.RIGHT{' // main menu (RL)
					+ `  left : 0%;`
					+ '}\n'
					+ '.main.LEFT{'
					+ `  right : 100%;`
					+ '}\n'

					+ '.main.DOWN{' // main menu (DT)
					+ `  top : 0%;`
					+ '}\n'
					+ '.main.TOP{'
					+ `  bottom : 100%;`
					+ '}\n'

					/*
					// main by corners
					+ '.main.RIGHT.DOWN{' // main menu (RD)
					+ `  left : 0%;`
					+ `  top : 0%;`
					+ `  translate : 0% 0%;`
					+ '}\n'

					+ '.main.RIGHT.TOP{' // main menu (RT)
					+ `  left : 0%;`
					+ `  top : -100%;`
					+ `  translate : 0% 0%;`
					+ '}\n'

					+ '.main.LEFT.DOWN{' // main menu (LD)
					+ `  left : -100%;`
					+ `  top : 0%;`
					+ `  translate : 0% 0%;`
					+ '}\n'

					+ '.main.LEFT.TOP{' // main menu (LT)
					+ `  left : -100%;`
					+ `  top : -100%;`
					+ `  translate : 0% 0%;`
					+ '}\n'
					*/

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
					+ '}\n' // TODO add comma

					/*
					// submenu by corners
					+ '.RIGHT.DOWN{' // submenu (RD)
					+ `  left : calc(100% + var(--posOfst));`
					+ `  top : var(--negOfst);`
					+ `  translate : 0% 0%;`
					+ '}\n'

					+ '.RIGHT.TOP{' // submenu (RT)
					+ `  left : calc(100% + var(--posOfst));`
					+ `  top : 100%;`
					+ `  translate : 0% calc(-100% + var(--posOfst));`
					+ '}\n'

					+ '.LEFT.DOWN{' // submenu (LD)
					+ `  left : 0%;`
					+ `  top : var(--negOfst);`
					+ `  translate : calc(-100% + var(--negOfst)) 0%;`
					+ '}\n'

					+ '.LEFT.TOP{' // submenu (LT)
					+ `  left : 0%;`
					+ `  top : 100%;`
					+ `  translate : calc(-100% + var(--negOfst)) calc(-100% + var(--posOfst));`
					+ '}\n',
					*/
			},
		};
		const class_stdFoldClose_part = { // left/top % relative to parent (layer) // translate % relative to menu itself
			menu : {
				css : '\n'
					+ '/* class_stdFoldClose_part */\n'
					+ '.menu.closed{' // all menu
					+ `  left : 0%;`
					+ `  top : 0%;`
					+ `  translate : 0% 0%;`
					+ '}\n',
			},
		};

		// sliding effect

		const class_slidingStartPos_part = {
			// left/top % relative to parent (layer) // translate % relative to menu itself
			menu : {
				css : '\n'
					+ '/* class_slidingStartPos_part */\n'

					// main by axes
					+ '.main._RIGHT{' // main menu (RL)
					+ `  left : 0%;`
					+ '}\n'
					+ '.main._LEFT{'
					+ `  right : 100%;`
					+ '}\n'

					+ '.main._DOWN{' // main menu (DT)
					+ `  top : 0%;`
					+ '}\n'
					+ '.main._TOP{'
					+ `  bottom : 100%;`
					+ '}\n'

					/*
					// main by corners
					+ '.main._RIGHT_DOWN{' // main menu (RD)
					+ `  left : 0%;`
					+ `  top : 0%;`
					+ `  translate : 0% 0%;`
					+ '}\n'

					+ '.main._RIGHT_TOP{' // main menu (RT)
					+ `  left : 0%;`
					+ `  top : -100%;`
					+ `  translate : 0% 0%;`
					+ '}\n'

					+ '.main._LEFT_DOWN{' // main menu (LD)
					+ `  left : -100%;`
					+ `  top : 0%;`
					+ `  translate : 0% 0%;`
					+ '}\n'

					+ '.main._LEFT_TOP{' // main menu (LT)
					+ `  left : -100%;`
					+ `  top : -100%;`
					+ `  translate : 0% 0%;`
					+ '}\n'
					*/

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
					+ '}\n' // TODO add comma

					/*
					// submenu by corners
					+ '._RIGHT_DOWN{' // submenu (RD)
					+ `  left : calc(0% + var(--negOfst));`
					+ `  top : var(--negOfst);`
					+ `  translate : 0% 0%;`
					+ '}\n'

					+ '._RIGHT_TOP{' // submenu (RT)
					+ `  left : calc(0% + var(--negOfst));`
					+ `  top : 100%;`
					+ `  translate : 0% calc(-100% + var(--posOfst));`
					+ '}\n'

					+ '._LEFT_DOWN{' // submenu (LD)
					+ `  left : 0%;`
					+ `  top : var(--negOfst);`
					+ `  translate : calc(0% + var(--posOfst)) 0%;`
					+ '}\n'

					+ '._LEFT_TOP{' // submenu (LT)
					+ `  left : 0%;`
					+ `  top : 100%;`
					+ `  translate : calc(0% + var(--posOfst)) calc(-100% + var(--posOfst));`
					+ '}\n',
					*/
			},
		};
		const class_slidingStartPos_partMain = {
			// left/top % relative to parent (layer) // translate % relative to menu itself
			menu : {
				css : '\n'
					+ '/* class_slidingStartPos_partMain */\n'

					/*
					+ '.main{' // main menu
					+ `  translate : 0% 0%;`
					+ '}\n'
					*/

					// main by axes
					+ '.main._RIGHT{' // main menu (RL)
					+ `  left : -100%;`
					+ '}\n'
					+ '.main._LEFT{'
					+ `  left : 0%;`
					+ '}\n'

					+ '.main._DOWN{' // main menu (DT)
					+ `  top : -100%;`
					+ '}\n'
					+ '.main._TOP{'
					+ `  top : 0%;`
					+ '}\n'

					// main by corners
					+ '.main._RIGHT_DOWN{' // main menu (RD)
					+ `  left : -100%;`
					+ `  top : -100%;`
					+ '}\n'

					+ '.main._RIGHT_TOP{' // main menu (RT)
					+ `  left : -100%;`
					+ `  top : 0%;`
					+ '}\n'

					+ '.main._LEFT_DOWN{' // main menu (LD)
					+ `  left : 0%;`
					+ `  top : -100%;`
					+ '}\n'

					+ '.main._LEFT_TOP{' // main menu (LT)
					+ `  left : 0%;`
					+ `  top : 0%;`
					+ '}\n',
			},
		};




		// fading effect

		const classFading_standard_part = (time='1s')=> ({
			// contains only differences from its base
			menu : {
				css : '\n'
				    + '/* classFading_standard_part */\n'
				    + '.menu{'
					+ '  opacity : 1;'
					+ `  transition : opacity ${time};`
				    + '}\n'
				    + '.closed{'
				    + '  opacity : 0.2;'
				    + '}\n',
			},
		});

		const classFading_itemBackdrop_part = (time='1s')=> ({
			// contains only differences from its base
			menu : {
				css : '\n'
				    + '/* classFading_itemBackdrop_part (menu) */\n'
					+ '.menu{'
					+ `  transition : background-color ${time};`
					+ '}\n'
					+ '.menu.closed{' // closed menus
					+ '  background-color : #00000000;'
					+ '}\n',
			},
			item : {
				css : '\n'
				    + '/* classFading_itemBackdrop_part (item) */\n'
				    + '.item{'
					+ '  opacity : 1;'
					+ `  transition : opacity ${time};`
				    + '}\n'
				    + '.closed .item{' // items in a closed menu
				    + '  opacity : 0;'
				    + '}\n',
			},
		});


		const merge_sdtFadingWithSliding = (time='1s')=>({
			menu : {
				/* style : {
					transition : `opacity ${time}, left ${time}, translate ${time}`,
				}, */
				css : '\n'
				+ '/* merge_sdtFadingWithSliding */\n'

				+ '.menu{'
				+ `  transition : opacity ${time}, left ${time}, right ${time};`
				+ '}\n',
			},
		});

		const sdtFadingWithSliding_additional_inits = {
			menu : (menu, uKey)=>{
				menu[TMEM] ||= {};
				menu[TMEM].stdFold_transitionProps = ['opacity'];
			},
		};

		const merge_itmbdropFadingWithSliding = (time='1s')=>({
			menu : {
				/* style : {
					transition : `background-color ${time}, left ${time}, translate ${time}`,
				}, */
				css : '\n'
				+ '/* merge_itmbdropFadingWithSliding */\n'

				+ '.menu{'
				+ `  transition : background-color ${time}, left ${time}, right ${time};`
				+ '}\n',
			},
		});

		const itmbdropFadingWithSliding_additional_inits = {
			menu : (menu, uKey)=>{
				menu[TMEM] ||= {};
				menu[TMEM].stdFold_transitionProps = ['background-color'];
			},
		};



		// AAA


		//const _baseMain = mix_base(_base, _baseMain_part);


		const class_base = mix_base(_base, withClass_part);






		// EMPTY THEME
		//
		
		const empty_base = mix_base(_base, foldRight_part());

		const emptyClass_base = mix_base(class_base, foldRight_part());

		





		







		// DEFAULT THEME
		//

		// MUST HAVE AT LEAST ALL TYPES (_all/root/layer/menu/item/behaviors) EVENT IF ARE EMPTY
		const sccm_default_cosmetic = { // SCCM original default style
			_all : {
				css : '\n'
				    + '.general{'
				    + '  padding : var(--padding);'
				    + '}\n',
			},
			root : {},
			layer : {},
			menu  : {
				class : ['general'],
				css : '\n'
				    + '.menu{'
				    + '  background-color : grey;'
				    + '  gap : 2px;'
				    + '  top : -2px;'
				    + '}\n'
				    + '.main{'
				    + '  top : 0px;'
				    + '}\n'
				    + '.closed{'
				    + '  opacity : 0.2;'
				    + '}\n',
			},
			item  : {
				class : ['general'],
				css : '\n'
				    + '.item{'
				    + '  background-color : lightgrey;'
				    + '}\n'
				    + '.inPath{'
				    + '  background-color : orange;'
				    + '}\n'
				    + '.hovered{'
				    + '  background-color : crimson;'
				    + '}\n'
				    + '.notAvailable{'
				    + '  color : green;'
				    + '}\n',
			},
			behaviors : {
				
			},
		};

		const default_base = mix_base(
			_base, withClass_part, class_ptrLogic_part, foldRight_part('2px'), sccm_default_cosmetic
		);
		const default_baseMain = mix_base(
			sccm_NULL, _baseMain_part, mainMenuClass_part, openRight_part
		);


		// ORIGINAL GLASS THEME
		//

		// MUST HAVE AT LEAST ALL TYPES (_all/root/layer/menu/item/behaviors) EVENT IF ARE EMPTY
		const sccm_glass_cosmetic = { // SCCM original glass style
			_all : {
				css : '\n'
				    + '/* sccm_glass_cosmetic (_all) */\n'
				    + '.general{'
				    + '  padding : var(--padding);'
					+ '  font-size : 20;'
				    + '}\n'
			},
			root : {},
			layer : {
				style:{
					boxShadow:'inset 0px 0px 0px 6px rgba(34, 136, 255, 0.533)',
					zIndex : 0,
				}}, // debug
			menu  : {
				class : ['general'],
				css : '\n'
				    + '/* sccm_glass_cosmetic (menu) */\n'
				    + '.menu{'
				    + '  background-color : #00000060;'
				    + '  gap : 2px;'
				    + '}\n'
			},
			item  : {
				class : ['general', 'item'],
				css : '\n'
				    + '/* sccm_glass_cosmetic (item) */\n'
				    + '.item{'
				    + '  padding : 4 128 4 24;'
				    + '  border-radius: 2px;'
				    + '  box-shadow: inset -3px -2px 9px 0px white;'
				    + '  background: linear-gradient(to top, #00000000 0%, #FFFFFF88 100%);'
					+ '  backdrop-filter: blur(25px);'
					//+ '  text-shadow: -1px 0px 0px white, 1px 1px 1px black, 1px 1px 5px white;'
					+ '  text-shadow: 1px 1px 0px white, 2px 2px 1px black;'
					+ '  color : #00817540;'
					+ '  font-family: Poppins, sans-serif;'
				    + '}\n'
				    + '.inPath{'
				    + '  background-color : orange;'
				    + '}\n'
				    + '.hovered{'
				    + '  background-color : #006dfd69;'
				    + '}\n'
				    + '.notAvailable{'
				    + '  color : green;'
				    + '}\n',
			},
			behaviors : {
				
				// AAA
				openMenu_method : (uKey)=>{
					return (menu)=>{
						menu.classList.remove('closed');

						//stdFold_process(menu, uKey, '2px') // px : equal to padding
						stdFoldUsingClass_process(menu, uKey, '2px') // 2 : equal to padding

						menu[uKey].elems.update_itemRects();
					};
				},
				
			},
		};

		const glass_base = mix_base(
			_base, _base_cssOffset_('2px','0px','2px'),
			withClass_part,
			class_ptrLogic_part,
			//foldRight_part('2px'),
			class_stdFold_part, // 2 px :  equal to padding
			classFading_itemBackdrop_part('1s'), sccm_glass_cosmetic,
		);
		const glass_baseMain = mix_base(

		);






		// AAA

		// SLIDING (DEFAULT) THEME
		//



		// MUST HAVE AT LEAST ALL TYPES (_all/root/layer/menu/item/behaviors) EVENT IF ARE EMPTY
		const sccm_sliding_behav = { // SCCM sliding style

			behaviors : {
				// binders
				//
				openMenu_method : (uKey)=>{
					return (menu)=>{
						//menu[uKey].elems.get_layer().style.zIndex = -1;
						//menu.classList.remove('closed');
						menu[uKey].elems.get_layer().style.zIndex = menu[uKey].elems.get_depth()-2;
						stdFoldUsingClassStartPos_process(menu, uKey, '2px');
						menu[uKey].elems.update_itemRects();
						menu.classList.remove('closing');
					};
				},
				closeMenu_method : (uKey)=>{
					return (menu)=>{
						menu.classList.add('closed');
						menu.classList.add('closing');
						menu.classList.remove('RIGHT', 'LEFT', 'DOWN', 'TOP');
						menu[uKey].elems.get_layer().style.zIndex = -1;
						//menu.style.left = '0%';
						//menu.style.left = '';
					};
				},
				setClosedMenu_method : (uKey)=>{
					return (menu)=>{
						menu.classList.add('closed');
						//menu.style.left = '0%';
						//menu.style.left = '';
					};
				},
			},
		};

		// everything optional (root/layer/menu/item)
		const sliding_additional_inits = {
			menu : (menu, uKey)=>{
				menu.addEventListener('transitionstart',e=>{
					if(menu === e.composedPath().shift()){
						//
						console.log(e);
						if(!menu.classList.contains('closed')){
							//menu[uKey].elems.get_layer().style.zIndex = -1;
							menu.style.pointerEvents = 'none';
						}
						//
					}
				});
				menu.addEventListener('transitioncancel',e=>{
					if(menu === e.composedPath().shift()){
						//
						console.log('cancel');
						//
					}
				});
				menu.addEventListener('transitionend',e=>{
					if(menu === e.composedPath().shift()){
						//
						const main = (menu[uKey].elems.get_depth() === 0);
						console.log(e);
						//if(main || ['left','right'].includes(e.propertyName) && !main)
						if(['left','right'].includes(e.propertyName))
						{
	
							if(!menu.classList.contains('closed')){
								menu[uKey].elems.update_itemRects();
								//menu[uKey].elems.get_layer().style.zIndex = menu[uKey].elems.get_chainLength()+1;
								menu[uKey].elems.get_layer().style.zIndex = menu[uKey].elems.get_depth();
								menu.style.pointerEvents = '';
							}else
							menu.classList.remove('closing');
							
						}
						//
					}
				});
			},
		};

		// ******  sliding remaking *********



		//const sliding_base = mix_base(sccm_NULL, sccm_sliding_part, glass_base);
		const sliding_base = mix_base(
			// glass base copy
				_base, _base_cssOffset_('2px','0px','2px'), // padd/bord/total
				withClass_part,
				class_ptrLogic_part,
				class_slidingStartPos_part, class_stdFold_part, //class_slidingStartPos_partMain,
				classFading_itemBackdrop_part('3s'), sccm_glass_cosmetic,
			// glass base end
			sccm_sliding_behav, merge_itmbdropFadingWithSliding('3s'),
			//class_stdFoldClose_part
		);

		//const sliding_baseMain = mix_base(default_baseMain, sccm_sliding_part);



		const sdtfoldAndSliding_addonInit = stack_addonInit(
			sdtFold_additional_inits, sliding_additional_inits,
			itmbdropFadingWithSliding_additional_inits
		);









		// WIN10 THEME
		//

		// contains only differences from its base
		const win10_base = mix_base(class_base, { // win10 style base
			menu : {
				style : {
					left : 'calc(100% - 3px)',
					top : '-3px', // border 1 + padding 2
				},
			},
		});

		// MUST HAVE AT LEAST ALL TYPES (_all/root/layer/menu/item/behaviors) EVENT IF ARE EMPTY
		const sccm_win10 = { // win10 style
			_all : {
				css : '\n'
				    + '.general{'
				    + '  font-size : 12;'
				    + '  font-family: "Segoe UI", Arial, sans-serif;'
				    + '}\n',
			},
			root : {},
			layer : {},
			menu  : {
				class : ['general'],
				css : '\n'
				    + '.menu{'
				    + '  background-color : #EEEEEE;'
					+ '  padding : 2px;'
					+ '  border : 1px solid #A0A0A0;'
					+ '  box-sizing : border-box;'
					+ '  box-shadow: 5px 5px 5px -5px black;'     // respects outside corners shadow pixel offset \ Use a pseudo elem ::before
					+ '  box-shadow: 5px 5px 4px -3px #00000080;' // respects inside corners shadow pixel offset  / using shadow to get perfect result
				    + '}\n'
				    + '.closed{'
				    + '  opacity : 0;'
				    + '}\n',
			},
			item  : {
				class : ['general', 'item'],
				css : '\n'
				    + '.item{'
				    + '  background-color : #EEEEEE;'
					+ '  padding : 4 128 4 32;'
					//+ '  mix-blend-mode: darken;'
				    + '}\n'
				    + '.inPath{'
				    + '  background-color : white;'
				    + '}\n'
				    + '.hovered{'
				    + '  background-color : white;'
				    + '}\n'
				    + '.notAvailable{'
				    //+ '  color : #6D6D6D;'
				    + '  color : #6A6A6A;'
				    + '}\n',
			},
			behaviors : {
				
			},
		};







		// MACOSX THEME
		//


		// general (contextual and horizontal)
		//

		// contains only differences from its base
		const sccm_macosx_cosmetic = { // macosx style base
			_all : {
				css : '\n'
				    + '.general{'
				    + '  font-size : 15;'
				    + '  font-family: "SF Pro", Arial, sans-serif;'
				    + '}\n',
			},
			menu  : {
				class : ['general'],
				css : '\n'
				    + '.menu{'
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
				    + '.main{'
				    + '  left : 0px;'
				    + '  top : 0px;'
				    + '}\n'
				    + '.closed{'
				    + '  opacity : 0;'
				    + '}\n',
			},
			item  : {
				class : ['general', 'item'],
				css : '\n'
				    + '.item{'
				    //+ '  background-color: rgba(230, 230, 230, 0.9);'
				    + '  padding : 4px 128px 4px 24px;'
				    + '}\n'
				    + '.inPath{'
				    + '  background-color : rgba(73, 154, 251, 1);'
				    + '  color : white;'
				    + '}\n'
				    + '.hovered{'
				    + '  background-color : rgba(73, 154, 251, 1);'
				    + '  color : white;'
				    + '}\n'
				    + '.notAvailable{'
				    + '  color : #6A6A6A;'
				    + '}\n'
				    + '.asSeparator{'
				    + '  margin : 4px 0px;'
				    + '  padding : 0px;'
				    + '  height : 2px;'
				    + '  background-color : rgba(150, 150, 150, 0.3);'
				    + '}\n',
			},
		};


		// contextual //
		//

		// MUST HAVE AT LEAST ALL TYPES (_all/root/layer/menu/item/behaviors) EVENT IF ARE EMPTY
		const macosx_base = mix_base(
			_base, withClass_part, class_ptrLogic_part, sccm_macosx_cosmetic
		);

		// MUST HAVE AT LEAST ALL TYPES (_all/root/layer/menu/item/behaviors) EVENT IF ARE EMPTY
		const macosx_baseMain = mix_base(
			sccm_NULL, _baseMain_part, mainMenuClass_part
		);


		// horizontal //
		//

		// contains only differences from its base
		const macosxHrz_cosmetic = {
			
			menu : {
				
				css : '\n'
				    + '.menu{'
				    + '  width : fit-content;' // move from _base to here
				    + '}\n'
				    + '.main{'
				    + '  width : 100%;'
				    + '  grid-auto-flow : column;'
				    + '  justify-content : start;'
				    + '  align-items : center;'
				    + '  padding : 0px 16px;'
				    + '  border-radius : 0px;'
				    + '}\n'
					+ '.submain{'
				    + '  left : 0px;'
				    + '  top : 100%;'
				    + '}\n',
			},
			item : {
				css : '\n'
				    + '.item.mainItem{'
				    + '  padding : 4px 12px;'
				    + '}\n',
			},
		};

		// contains only differences from its base
		const macosxHrz_rectLogic = {
			root : {
				style : {
					position : '', // reset from _base
				},
			},
			menu : {
				style : {
					width : '', // unlock from _base
				},
			},
		};

		// MUST HAVE AT LEAST ALL TYPES (_all/root/layer/menu/item/behaviors) EVENT IF ARE EMPTY
		const macosxHrz_base = mix_base(macosx_base, macosxHrz_cosmetic, macosxHrz_rectLogic);

		// main menu
		//

		// contains only differences from its base
		const macosxHrz_partMain = {
			layer : {
				style : {
					minWidth : '100%',
				},
			},
			item : {
				class : ['mainItem'],
			},
		};

		// MUST HAVE AT LEAST ALL TYPES (_all/root/layer/menu/item/behaviors) EVENT IF ARE EMPTY
		const macosxHrz_baseMain = mix_base(macosx_baseMain, macosxHrz_partMain);

		// submain menu
		//
	
		// contains only differences from its base
		const macosxHrz_partSubmain = {
			menu : {
				class : ['submain']
			},
		};
		
		// MUST HAVE AT LEAST ALL TYPES (_all/root/layer/menu/item/behaviors) EVENT IF ARE EMPTY
		const macosxHrz_baseSubmain = mix_base(sccm_NULL, macosxHrz_partSubmain);


		/*
		    HANDLE ADDITIONAL MANUAL SETTINGS :
		    -----------------------------------
		    handle.style.position = 'fixed' ;
		    handle.style.width    =  '100%' ;
		    handle.style.left     =   '0px' ;
		    handle.style.top      =   '0px' ;
		*/
		const macosxHrz_setHandleConfig_part = {
			// use on handle, like that :
			//   providing.theme.macosx.get_horizontalSetHandleConfig('handle').init(handle)
			root : {
				style : {
					position : 'fixed',
					width    : '100%',
					left     : '0px',
					top      : '0px',
				},
			},
		};

		const macosxHrz_setHandleConfig = mix_base(sccm_NULL, macosxHrz_setHandleConfig_part);

		// macosx item separator
		//

		const macosx_setSeparatorClass_part = {
			item : { // use on item
				class : ['asSeparator'],
			},
		};

		const macosx_setSeparatorClass = mix_base(sccm_NULL, macosx_setSeparatorClass_part);
		
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
				default     : make_themeGenerator(default_base, sccm_NULL),
				defaultMain : make_themeGenerator(default_base, default_baseMain),
				glass     : make_themeGenerator(glass_base, sccm_NULL, sdtFold_additional_inits),
				glassMain : make_themeGenerator(glass_base, default_baseMain),
				fading : null,
				sliding : make_themeGenerator(sliding_base, sccm_NULL, sdtfoldAndSliding_addonInit),
				slidingMain : make_themeGenerator(sliding_base, default_baseMain, sdtfoldAndSliding_addonInit),
				growing : null,
				growingMain : null,
			},
			windows10 : {
				default : make_themeGenerator(win10_base, sccm_win10),
				noFading : null,
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

		const rect_to_box = (rect, R=rect)=>{
			// convert {x,y, w,h} to {l, r, t, b}
			return {l:R.x, r:R.x+R.w, t:R.y, b:R.y+R.h};
		};

		const inBoundRule = { // all methods return 'in bound test result' (bool)
			l : (elemL,frameL)=>elemL>frameL,
			r : (elemR,frameR)=>elemR<frameR,
			t : (elemT,frameT)=>elemT>frameT,
			b : (elemB,frameB)=>elemB<frameB,
		};

		const check_sides = ({elem, sides, frameRect}, user_key)=>{
			const uKey = user_key;
			const frameBox = rect_to_box(frameRect);
			
			for(let sideName in sides){

				// get side object
				const side = sides[sideName];

				// get elem rect
				side.setOpen(elem);
				elem[uKey].update_rect();
				const elemRect = elem[uKey].get_rect();
				side.cancel(elem);

				// tests open side conditions
				let inBound = true;
				for(const brd of side.checkBorderList||[]){
					inBound = inBoundRule[brd]( elemRect[brd], frameBox[brd] );
					if( !inBound ) break;
				}
				
				if(inBound) return sideName;
			}

			return null;
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


		const build_sideRules = (sides)=>{
			const output = {};
			for(const sName in sides){
				const {checkBorderList} = sides[sName];
				output[sName] = { ...make_sideMethods(sides[sName]), checkBorderList };
			}
			return output;
		};

		/*
		// input template (not afffected, because used as copy) :
		SIDES = [
			// declares by priotity order
			{
				name : '',
				template : {
					style : { propName:'propValue', ... },
					class:{addset:[],remset:[]},
					otherProp:{},
					checkBorderList : [],
				},
				customProcess : (menu, uKey, addOffset, side)=>{}
			},
			...
		];
		// internal tmp template copy (remake format as sdtSIDES for process only) :
		sidesTemplate = [
			// declares by priotity order
			NAME : {
				style : { propName:'propValue', ... },
				class:{addset:[],remset:[]},
				otherProp:{},
				checkBorderList : [],
				variables : {
					style:{ propName:'variableValue', ... },
				},
				customProcess : (menu, uKey, addOffset, side)=>{},
			},
			...
		];
		*/

		const compile_customPreset_varStyleOnly = (SIDES, frameRect)=>{
			const SMEM = Symbol('Sides Private Memory');
			return {
				init : (root)=>{ // reserves alloc mem on root for process() running later
					const sidesTemplate = {};
					const updateStack = [];
					for(const SIDE of SIDES){
						const template = structuredClone(SIDE.template);
						template.variables = {style:{}};
						template.customProcess = SIDE.customProcess;
						sidesTemplate[SIDE.name] = template;
						for(const sName in SIDE.variables.style){ // fill updateStack
							const dst = template.style;
							const src = template.variables.style;
							updateStack.push( ()=>dst[sName]=src[sName] );
						}
					}
					const sides = build_sideRules(sidesTemplate);
					root[TMEM] ||= {};
					//root[TMEM][SMEM] ||= {}; // consider it if got error (TODO test compile_)
					root[TMEM][SMEM].get_sides = ()=>sides;
					root[TMEM][SMEM].update_vars = ()=>updateStack.forEach( update=>update() );
				},
				process : (menu, uKey, addOffset)=>{ // uses reserved mem on root previously in init()
					const sidesMem = menu[uKey].elems.get_root()[TMEM][SMEM]; // get mem from root init scope
					const sides = sidesMem.get_sides();
					for(const sName in sides){
						const side = sides[sName];
						// custom process (.variables modification process)
						side.customProcess(menu, uKey, addOffset, side);
					}
					sidesMem.update_vars(); // update variable styles (transfer .variables -> )
					frameRect ||= {x:0,y:0,w:innerWidth,h:innerHeight}; // window as
					const settings = {elem:menu, sides, frameRect};
					const sideName = check_sides(settings, uKey);
					const inBound = !!sideName;
					const side = sides[sideName];
					const apply = inBound ? ()=>side.setOpen(menu) : null;
					return {status:inBound, sideName, _apply:apply, side, sides}
				},
			};
		};

		// AAA
		const presets = {
			standard : {
				RIGHTLEFT : {
					init : (root)=>{ // init mem space (on menu root)
						const sidesTemplate = {
							// declares by priotity order
							RIGHT : {
								style : {left:'___variable___',/* transition:'none' */},
								checkBorderList : ['r'],
							},
							LEFT : {
								style : {left:"___variable___",/* transition:'none' */},
								checkBorderList : ['l'],
							},
						};
						const sides = build_sideRules(sidesTemplate);
						const update = (leftForRIGHT, leftForLEFT)=>{
							sidesTemplate.RIGHT.style.left = leftForRIGHT;
							sidesTemplate.LEFT.style.left  = leftForLEFT;
						};
						root[TMEM] ||= {};
						root[TMEM].get_RIGHTLEFT = (...args)=>{ update(...args); return sides; };
					},
					process : (menu, uKey, addOffset)=>{ // check

						addOffset ||= { mainMenu:{RIGHT:'0px',LEFT:'0px'}, subMenu:{RIGHT:'0px',LEFT:'0px'} };

						menu[uKey].update_rect();
						const menuWidth = menu[uKey].get_rect().w;
						
						let offsets = {RIGHT:'',LEFT:''}; // priority by order
		
						if(menu[uKey].elems.get_chainLength() === 0){
							// main menu case
							offsets.RIGHT = `calc(0px + ${addOffset.mainMenu?.RIGHT||'0px'})`;
							offsets.LEFT  = `calc(-100% + ${addOffset.mainMenu?.LEFT||'0px'})`;
						}else{ // submenu case
							offsets.RIGHT = `calc(100% + ${addOffset.subMenu?.RIGHT||'0px'})`;
							offsets.LEFT  = `calc(-${menuWidth}px + ${addOffset.subMenu?.LEFT||'0px'})`;
						}
						const offsetArray = Object.values(offsets);
		
						const frameRect = {x:0,y:0,w:innerWidth,h:innerHeight}; // window as
						const sides = menu[uKey].elems.get_root()[TMEM].get_RIGHTLEFT(...offsetArray);
						const settings = {elem:menu, sides, frameRect};
						
						const sideName = check_sides(settings, uKey);
						const inBound = !!sideName;
						const side = sides[sideName];
						const apply = inBound ? (()=>menu.style.left=offsets[sideName]||'') : null;
						return {status:inBound, sideName, _apply:apply, side, sides};
					},
				},
				DOWNTOP : {
					init : (root)=>{ // init mem space (on menu root)
						const sidesTemplate = {
							// declares by priotity order
							DOWN : {
								style : {top:'___variable___',/* transition:'none' */},
								checkBorderList : ['b'],
							},
							TOP : {
								style : {top:"___variable___",/* transition:'none' */},
								checkBorderList : ['t'],
							},
						};
						const sides = build_sideRules(sidesTemplate);
						const update = (topForDOWN, topForTOP)=>{
							sidesTemplate.DOWN.style.top = topForDOWN;
							sidesTemplate.TOP.style.top  = topForTOP;
						};
						root[TMEM] ||= {};
						root[TMEM].get_DOWNTOP = (...args)=>{ update(...args); return sides; };
					},
					process : (menu, uKey, addOffset)=>{ // check and apply

						addOffset ||= { mainMenu:{DOWN:'0px',TOP:'0px'}, subMenu:{DOWN:'0px',TOP:'0px'} };

						menu[uKey].update_rect();
						const menuHeight = menu[uKey].get_rect().h;
		
						let offsets = {DOWN:'',TOP:''}; // priority by order
		
						if(menu[uKey].elems.get_chainLength() === 0){
							// main menu case
							offsets.DOWN = `calc(0px + ${addOffset.mainMenu?.DOWN||'0px'})`;
							offsets.TOP  = `calc(-100% + ${addOffset.mainMenu?.TOP||'0px'})`;
						}else{ // submenu case
							offsets.DOWN = `calc(0% + ${addOffset.subMenu?.DOWN||'0px'})`;
							offsets.TOP  = `calc(100% - ${menuHeight}px + ${addOffset.subMenu?.TOP||'0px'})`;
						}
						const offsetArray = Object.values(offsets);
		
						const frameRect = {x:0,y:0,w:innerWidth,h:innerHeight}; // window as
						const sides = menu[uKey].elems.get_root()[TMEM].get_DOWNTOP(...offsetArray);
						const settings = {elem:menu, sides, frameRect};

						const sideName = check_sides(settings, uKey);
						const inBound = !!sideName;
						const side = sides[sideName];
						const apply = inBound ? (()=>menu.style.top=offsets[sideName]||'') : null;
						return {status:inBound, sideName, _apply:apply, side, sides};
					},
				},
			},
		};

		return {check_sides, make_sideMethods, build_sideRules, presets};
	})();

	// MAKES PUBLIC FEATURES
	// - does no check
	// - protects 'this' var
	// - export to main api
	SCCM.providing ??= {};
	SCCM.providing.preventOverflowLib = {};
	SCCM.providing.preventOverflowLib.check_sides = (settings, user_key)=>{
		core.preventOverflowLib.check_sides(settings, user_key);
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
			get_copy(){
				return {...this.props};
			},
			rect_method : get_borderRect,
			update(){
				this.props = this.rect_method(elem);
			},
			set_borderRect(bool){
				this.rect_method = bool ? get_borderRect : get_elemRect;
			},
		};
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
			// in sdt click case, args contains : + allowedEventProps (alt 1)
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
			if(instance.sdtClickEnable){
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
				instance.sdtClickEnable = bool;
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
				elem[APP].rect.update();
			};
			elem[uKey].get_rect = ()=>{
				check_handleConnexion();
				return elem[APP].rect.get_copy();
			};
			elem[uKey].set_rectWithBorder = (bool)=>{
				check_handleConnexion();
				elem[APP].rect.set_borderRect(bool);
			};
		};





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
			mainInit.root(elem);
			
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
			mainInit.layer(elem);
			init?.(elem);

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
				get_chainLength : ()=>instance.menuChain.length,
				get_menuChain : ()=>[...instance.menuChain],
				get_itemPath : ()=>[...instance.itemPath],
				get_depth : ()=>elem[APP].depth,
				get_itsItemPath : ()=>[...elem[APP].itemPath],
				get_itsMenuChain : ()=>instance.menuChain.slice(0, elem[APP].depth+1),
				get_upItem : ()=>elem[APP].itemPath.at(-1)||null,
				get_layer : ()=>elem[APP].layer,
				get_items : ()=>[...elem[APP].items],
				update_itemRects : (submenuOnly=true)=>update_subRects(elem, submenuOnly),
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
			mainInit.menu(elem);
			init?.(elem);

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
			mainInit.item(elem);
			init?.(elem);

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


		// default theme
		core.theme.sccmOriginal.default.set(uKey);
		const { 
			css      : default_css,
			initELEM : defaultInit,
			behavior : defaultBehavior,
		} = core.theme.sccmOriginal.default.get();

		// final theme

		const mainInit = {...defaultInit, ...(usrTemplate.settings?.initELEM||{})};

		const mainBehavior = {...defaultBehavior, ...(usrTemplate.settings?.behavior||{})};

		// sccm instance

		let instance = {
			isOpen : false,

			hoverMenu : null,
			hoverItem : null,

			menuChain : [],
			itemPath  : [],

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

			get_hook   : ()=>usrHookElem,
			get_handle : ()=>handle,
			get_root   : ()=>root,

			get_mainMenu(){ return this.all_menus[0]; },
		};

		instance.detainedItemReaction = null; // format : {item,reactionStack[function,...]}

		instance.foldableDelay = 100; // also considerated as flag : false if === 0 , true if > 0
		instance.merge_delaySysWithItemReaction = false; // usr can release delaySys but delaySys will release itemReaction at every delaySys' release
		instance.lastLateProcessID = null;
		instance.clear_lateProcessOnLeaveItem = true;

		instance.sdtClickEnable = true;

		let contextData = null;

		let usrHookElem = null;
		let handle = build_handleWithShadow();
		let container = handle[APP].container;
		let root = make_sccm_root();

		builder(usrTemplate.mainMenu, true, root);

		let usrStyle = document.createElement('STYLE');
		usrStyle.textContent = usrTemplate.settings?.css || default_css;

		container.appendChild(usrStyle);
		container.appendChild(root);


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