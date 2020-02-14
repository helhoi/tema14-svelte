
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let stylesheet;
    let active = 0;
    let current_rules = {};
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash(rule)}_${uid}`;
        if (!current_rules[name]) {
            if (!stylesheet) {
                const style = element('style');
                document.head.appendChild(style);
                stylesheet = style.sheet;
            }
            current_rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ``}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        node.style.animation = (node.style.animation || '')
            .split(', ')
            .filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        )
            .join(', ');
        if (name && !--active)
            clear_rules();
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            let i = stylesheet.cssRules.length;
            while (i--)
                stylesheet.deleteRule(i);
            current_rules = {};
        });
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }

    let promise;
    function wait() {
        if (!promise) {
            promise = Promise.resolve();
            promise.then(() => {
                promise = null;
            });
        }
        return promise;
    }
    function dispatch(node, direction, kind) {
        node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    const null_transition = { duration: 0 };
    function create_bidirectional_transition(node, fn, params, intro) {
        let config = fn(node, params);
        let t = intro ? 0 : 1;
        let running_program = null;
        let pending_program = null;
        let animation_name = null;
        function clear_animation() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function init(program, duration) {
            const d = program.b - t;
            duration *= Math.abs(d);
            return {
                a: t,
                b: program.b,
                d,
                duration,
                start: program.start,
                end: program.start + duration,
                group: program.group
            };
        }
        function go(b) {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            const program = {
                start: now() + delay,
                b
            };
            if (!b) {
                // @ts-ignore todo: improve typings
                program.group = outros;
                outros.r += 1;
            }
            if (running_program) {
                pending_program = program;
            }
            else {
                // if this is an intro, and there's a delay, we need to do
                // an initial tick and/or apply CSS animation immediately
                if (css) {
                    clear_animation();
                    animation_name = create_rule(node, t, b, duration, delay, easing, css);
                }
                if (b)
                    tick(0, 1);
                running_program = init(program, duration);
                add_render_callback(() => dispatch(node, b, 'start'));
                loop(now => {
                    if (pending_program && now > pending_program.start) {
                        running_program = init(pending_program, duration);
                        pending_program = null;
                        dispatch(node, running_program.b, 'start');
                        if (css) {
                            clear_animation();
                            animation_name = create_rule(node, t, running_program.b, running_program.duration, 0, easing, config.css);
                        }
                    }
                    if (running_program) {
                        if (now >= running_program.end) {
                            tick(t = running_program.b, 1 - t);
                            dispatch(node, running_program.b, 'end');
                            if (!pending_program) {
                                // we're done
                                if (running_program.b) {
                                    // intro — we can tidy up immediately
                                    clear_animation();
                                }
                                else {
                                    // outro — needs to be coordinated
                                    if (!--running_program.group.r)
                                        run_all(running_program.group.c);
                                }
                            }
                            running_program = null;
                        }
                        else if (now >= running_program.start) {
                            const p = now - running_program.start;
                            t = running_program.a + running_program.d * easing(p / running_program.duration);
                            tick(t, 1 - t);
                        }
                    }
                    return !!(running_program || pending_program);
                });
            }
        }
        return {
            run(b) {
                if (is_function(config)) {
                    wait().then(() => {
                        // @ts-ignore
                        config = config();
                        go(b);
                    });
                }
                else {
                    go(b);
                }
            },
            end() {
                clear_animation();
                running_program = pending_program = null;
            }
        };
    }

    const globals = (typeof window !== 'undefined' ? window : global);
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.18.2' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
    }

    /* src/components/Climb.svelte generated by Svelte v3.18.2 */

    const { console: console_1 } = globals;
    const file = "src/components/Climb.svelte";

    function create_fragment(ctx) {
    	let section;
    	let h3;
    	let t1;
    	let img0;
    	let img0_src_value;
    	let t2;
    	let img1;
    	let img1_src_value;

    	const block = {
    		c: function create() {
    			section = element("section");
    			h3 = element("h3");
    			h3.textContent = "scroll to climb..";
    			t1 = space();
    			img0 = element("img");
    			t2 = space();
    			img1 = element("img");
    			attr_dev(h3, "class", "svelte-t5445k");
    			add_location(h3, file, 28, 4, 1127);
    			if (img0.src !== (img0_src_value = "./img/ladder.png")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "class", "ladder svelte-t5445k");
    			attr_dev(img0, "alt", "title");
    			add_location(img0, file, 29, 4, 1158);
    			if (img1.src !== (img1_src_value = /*src*/ ctx[2])) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "climber");
    			attr_dev(img1, "class", "climber svelte-t5445k");
    			add_location(img1, file, 30, 4, 1239);
    			add_location(section, file, 27, 0, 1113);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, h3);
    			append_dev(section, t1);
    			append_dev(section, img0);
    			/*img0_binding*/ ctx[6](img0);
    			append_dev(section, t2);
    			append_dev(section, img1);
    			/*img1_binding*/ ctx[7](img1);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*src*/ 4 && img1.src !== (img1_src_value = /*src*/ ctx[2])) {
    				attr_dev(img1, "src", img1_src_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    			/*img0_binding*/ ctx[6](null);
    			/*img1_binding*/ ctx[7](null);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	const dispatch = createEventDispatcher();
    	let { scroll } = $$props, { isScrolling } = $$props;

    	//local vars bound to the two image elements
    	let ladder, climber;

    	const writable_props = ["scroll", "isScrolling"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<Climb> was created with unknown prop '${key}'`);
    	});

    	function img0_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(0, ladder = $$value);
    		});
    	}

    	function img1_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(1, climber = $$value);
    		});
    	}

    	$$self.$set = $$props => {
    		if ("scroll" in $$props) $$invalidate(3, scroll = $$props.scroll);
    		if ("isScrolling" in $$props) $$invalidate(4, isScrolling = $$props.isScrolling);
    	};

    	$$self.$capture_state = () => {
    		return {
    			scroll,
    			isScrolling,
    			ladder,
    			climber,
    			src
    		};
    	};

    	$$self.$inject_state = $$props => {
    		if ("scroll" in $$props) $$invalidate(3, scroll = $$props.scroll);
    		if ("isScrolling" in $$props) $$invalidate(4, isScrolling = $$props.isScrolling);
    		if ("ladder" in $$props) $$invalidate(0, ladder = $$props.ladder);
    		if ("climber" in $$props) $$invalidate(1, climber = $$props.climber);
    		if ("src" in $$props) $$invalidate(2, src = $$props.src);
    	};

    	let src;

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*isScrolling*/ 16) {
    			// a reactive var: src always checks whether isScrolling is true or false, and can thus be used to trigger shift between the images 
    			 $$invalidate(2, src = isScrolling
    			? "./img/climber.gif"
    			: "./img/climber_still.png");
    		}

    		if ($$self.$$.dirty & /*ladder, climber, scroll*/ 11) {
    			// an anonymous reactive variable checks the position of the two images and dispatches 'done', when the climber has reached a certain distance to the top of the latter (change 150 to something else to tweak)
    			 {
    				if (ladder && climber) {
    					$$invalidate(0, ladder.style.transform = `translateY(${scroll / 8}px)`, ladder);

    					if (ladder.getBoundingClientRect().top - 150 > climber.getBoundingClientRect().top) {
    						console.log("ready to jump..");
    						dispatch("done");
    					}
    				}
    			}
    		}
    	};

    	return [
    		ladder,
    		climber,
    		src,
    		scroll,
    		isScrolling,
    		dispatch,
    		img0_binding,
    		img1_binding
    	];
    }

    class Climb extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { scroll: 3, isScrolling: 4 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Climb",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*scroll*/ ctx[3] === undefined && !("scroll" in props)) {
    			console_1.warn("<Climb> was created without expected prop 'scroll'");
    		}

    		if (/*isScrolling*/ ctx[4] === undefined && !("isScrolling" in props)) {
    			console_1.warn("<Climb> was created without expected prop 'isScrolling'");
    		}
    	}

    	get scroll() {
    		throw new Error("<Climb>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set scroll(value) {
    		throw new Error("<Climb>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isScrolling() {
    		throw new Error("<Climb>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isScrolling(value) {
    		throw new Error("<Climb>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    function fade(node, { delay = 0, duration = 400, easing = identity }) {
        const o = +getComputedStyle(node).opacity;
        return {
            delay,
            duration,
            easing,
            css: t => `opacity: ${t * o}`
        };
    }

    /* src/components/Jump.svelte generated by Svelte v3.18.2 */

    const { console: console_1$1 } = globals;
    const file$1 = "src/components/Jump.svelte";

    // (28:4) {#if manIsDangerouslyCloseToTheEnd}
    function create_if_block(ctx) {
    	let h4;
    	let h4_transition;
    	let current;

    	const block = {
    		c: function create() {
    			h4 = element("h4");
    			h4.textContent = "Oh, the man is getting close to the wall, you may wanna do something about that...";
    			attr_dev(h4, "class", "svelte-fwyfi5");
    			add_location(h4, file$1, 28, 8, 707);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h4, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (!h4_transition) h4_transition = create_bidirectional_transition(h4, fade, {}, true);
    				h4_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			if (!h4_transition) h4_transition = create_bidirectional_transition(h4, fade, {}, false);
    			h4_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h4);
    			if (detaching && h4_transition) h4_transition.end();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(28:4) {#if manIsDangerouslyCloseToTheEnd}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let section;
    	let h3;
    	let t1;
    	let t2;
    	let img;
    	let img_src_value;
    	let current;
    	let if_block = /*manIsDangerouslyCloseToTheEnd*/ ctx[1] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			section = element("section");
    			h3 = element("h3");
    			h3.textContent = "scroll to jump →";
    			t1 = space();
    			if (if_block) if_block.c();
    			t2 = space();
    			img = element("img");
    			attr_dev(h3, "class", "svelte-fwyfi5");
    			add_location(h3, file$1, 25, 4, 632);
    			if (img.src !== (img_src_value = "./img/man.gif")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "man");
    			attr_dev(img, "class", "man svelte-fwyfi5");
    			add_location(img, file$1, 31, 4, 830);
    			add_location(section, file$1, 24, 0, 618);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, h3);
    			append_dev(section, t1);
    			if (if_block) if_block.m(section, null);
    			append_dev(section, t2);
    			append_dev(section, img);
    			/*img_binding*/ ctx[5](img);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*manIsDangerouslyCloseToTheEnd*/ ctx[1]) {
    				if (!if_block) {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(section, t2);
    				} else {
    					transition_in(if_block, 1);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    			if (if_block) if_block.d();
    			/*img_binding*/ ctx[5](null);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	const dispatch = createEventDispatcher();
    	let { scroll } = $$props, { width } = $$props;
    	let man, manIsDangerouslyCloseToTheEnd = false;
    	const writable_props = ["scroll", "width"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1$1.warn(`<Jump> was created with unknown prop '${key}'`);
    	});

    	function img_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(0, man = $$value);
    		});
    	}

    	$$self.$set = $$props => {
    		if ("scroll" in $$props) $$invalidate(2, scroll = $$props.scroll);
    		if ("width" in $$props) $$invalidate(3, width = $$props.width);
    	};

    	$$self.$capture_state = () => {
    		return {
    			scroll,
    			width,
    			man,
    			manIsDangerouslyCloseToTheEnd
    		};
    	};

    	$$self.$inject_state = $$props => {
    		if ("scroll" in $$props) $$invalidate(2, scroll = $$props.scroll);
    		if ("width" in $$props) $$invalidate(3, width = $$props.width);
    		if ("man" in $$props) $$invalidate(0, man = $$props.man);
    		if ("manIsDangerouslyCloseToTheEnd" in $$props) $$invalidate(1, manIsDangerouslyCloseToTheEnd = $$props.manIsDangerouslyCloseToTheEnd);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*man, scroll, width*/ 13) {
    			 {
    				if (man) {
    					$$invalidate(0, man.style.transform = `translateX(${scroll / 6}px)`, man);
    					console.log(man.getBoundingClientRect().right, width);

    					if (man.getBoundingClientRect().right > width) {
    						$$invalidate(1, manIsDangerouslyCloseToTheEnd = true);
    					} else {
    						$$invalidate(1, manIsDangerouslyCloseToTheEnd = false);
    					}
    				}
    			}
    		}
    	};

    	return [man, manIsDangerouslyCloseToTheEnd, scroll, width, dispatch, img_binding];
    }

    class Jump extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { scroll: 2, width: 3 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Jump",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*scroll*/ ctx[2] === undefined && !("scroll" in props)) {
    			console_1$1.warn("<Jump> was created without expected prop 'scroll'");
    		}

    		if (/*width*/ ctx[3] === undefined && !("width" in props)) {
    			console_1$1.warn("<Jump> was created without expected prop 'width'");
    		}
    	}

    	get scroll() {
    		throw new Error("<Jump>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set scroll(value) {
    		throw new Error("<Jump>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get width() {
    		throw new Error("<Jump>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set width(value) {
    		throw new Error("<Jump>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/Fall.svelte generated by Svelte v3.18.2 */

    const file$2 = "src/components/Fall.svelte";

    function create_fragment$2(ctx) {
    	let section;
    	let h1;

    	const block = {
    		c: function create() {
    			section = element("section");
    			h1 = element("h1");
    			h1.textContent = "Fall";
    			add_location(h1, file$2, 3, 4, 16);
    			add_location(section, file$2, 2, 0, 2);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, h1);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    class Fall extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Fall",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src/components/Swim.svelte generated by Svelte v3.18.2 */

    const file$3 = "src/components/Swim.svelte";

    function create_fragment$3(ctx) {
    	let section;
    	let h1;

    	const block = {
    		c: function create() {
    			section = element("section");
    			h1 = element("h1");
    			h1.textContent = "Swim";
    			add_location(h1, file$3, 3, 4, 16);
    			add_location(section, file$3, 2, 0, 2);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, h1);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    class Swim extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Swim",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /*!
     * Run a callback function after scrolling has stopped
     * (c) 2017 Chris Ferdinandi, MIT License, https://gomakethings.com
     * @param  {Function} callback The function to run after scrolling
     */
    const scrollStop = function (callback) {

    	// Make sure a valid callback was provided
    	if (!callback || typeof callback !== 'function') {
    		console.log('idop');
    		return
    	}
    	// Setup scrolling variable
    	var isScrolling;

    	// Listen for scroll events
    	window.addEventListener('scroll', function (event) {

    		// Clear our timeout throughout the scroll
    		window.clearTimeout(isScrolling);

    		// Set a timeout to run after scrolling ends
    		isScrolling = setTimeout(function() {

    			// Run the callback
    			callback(); 

    		}, 66);

    	}, false);

    };

    /* src/App.svelte generated by Svelte v3.18.2 */

    const { window: window_1 } = globals;
    const file$4 = "src/App.svelte";

    // (64:27) 
    function create_if_block_3(ctx) {
    	let current;

    	const swim = new Swim({
    			props: { scroll: /*y*/ ctx[1] },
    			$$inline: true
    		});

    	swim.$on("done", /*changeScene*/ ctx[8]);

    	const block = {
    		c: function create() {
    			create_component(swim.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(swim, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const swim_changes = {};
    			if (dirty & /*y*/ 2) swim_changes.scroll = /*y*/ ctx[1];
    			swim.$set(swim_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(swim.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(swim.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(swim, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(64:27) ",
    		ctx
    	});

    	return block;
    }

    // (62:27) 
    function create_if_block_2(ctx) {
    	let current;

    	const fall = new Fall({
    			props: { scroll: /*y*/ ctx[1] },
    			$$inline: true
    		});

    	fall.$on("done", /*changeScene*/ ctx[8]);

    	const block = {
    		c: function create() {
    			create_component(fall.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(fall, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const fall_changes = {};
    			if (dirty & /*y*/ 2) fall_changes.scroll = /*y*/ ctx[1];
    			fall.$set(fall_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(fall.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(fall.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(fall, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(62:27) ",
    		ctx
    	});

    	return block;
    }

    // (60:27) 
    function create_if_block_1(ctx) {
    	let current;

    	const jump = new Jump({
    			props: {
    				scroll: /*y*/ ctx[1],
    				width: /*w*/ ctx[4]
    			},
    			$$inline: true
    		});

    	jump.$on("done", /*changeScene*/ ctx[8]);

    	const block = {
    		c: function create() {
    			create_component(jump.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(jump, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const jump_changes = {};
    			if (dirty & /*y*/ 2) jump_changes.scroll = /*y*/ ctx[1];
    			if (dirty & /*w*/ 16) jump_changes.width = /*w*/ ctx[4];
    			jump.$set(jump_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(jump.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(jump.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(jump, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(60:27) ",
    		ctx
    	});

    	return block;
    }

    // (58:1) {#if sceneIndex == 0}
    function create_if_block$1(ctx) {
    	let current;

    	const climb = new Climb({
    			props: {
    				scroll: /*y*/ ctx[1],
    				isScrolling: /*isScrolling*/ ctx[5]
    			},
    			$$inline: true
    		});

    	climb.$on("done", /*changeScene*/ ctx[8]);

    	const block = {
    		c: function create() {
    			create_component(climb.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(climb, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const climb_changes = {};
    			if (dirty & /*y*/ 2) climb_changes.scroll = /*y*/ ctx[1];
    			if (dirty & /*isScrolling*/ 32) climb_changes.isScrolling = /*isScrolling*/ ctx[5];
    			climb.$set(climb_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(climb.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(climb.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(climb, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(58:1) {#if sceneIndex == 0}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let scrolling = false;

    	let clear_scrolling = () => {
    		scrolling = false;
    	};

    	let scrolling_timeout;
    	let main;
    	let div;
    	let span0;
    	let span1;
    	let t1_value = Math.round(/*y*/ ctx[1]) + "";
    	let t1;
    	let t2;
    	let span2;
    	let span3;
    	let t4;
    	let t5;
    	let span4;
    	let span5;
    	let t7_value = /*scenes*/ ctx[6][/*sceneIndex*/ ctx[0]] + "";
    	let t7;
    	let t8;
    	let current_block_type_index;
    	let if_block;
    	let current;
    	let dispose;
    	add_render_callback(/*onwindowscroll*/ ctx[9]);
    	add_render_callback(/*onwindowresize*/ ctx[10]);
    	const if_block_creators = [create_if_block$1, create_if_block_1, create_if_block_2, create_if_block_3];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*sceneIndex*/ ctx[0] == 0) return 0;
    		if (/*sceneIndex*/ ctx[0] == 1) return 1;
    		if (/*sceneIndex*/ ctx[0] == 2) return 2;
    		if (/*sceneIndex*/ ctx[0] == 3) return 3;
    		return -1;
    	}

    	if (~(current_block_type_index = select_block_type(ctx))) {
    		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	}

    	const block = {
    		c: function create() {
    			main = element("main");
    			div = element("div");
    			span0 = element("span");
    			span0.textContent = "y pos";
    			span1 = element("span");
    			t1 = text(t1_value);
    			t2 = space();
    			span2 = element("span");
    			span2.textContent = "scrolling";
    			span3 = element("span");
    			t4 = text(/*isScrolling*/ ctx[5]);
    			t5 = space();
    			span4 = element("span");
    			span4.textContent = "scene";
    			span5 = element("span");
    			t7 = text(t7_value);
    			t8 = space();
    			if (if_block) if_block.c();
    			add_location(span0, file$4, 48, 2, 1350);
    			add_location(span1, file$4, 48, 20, 1368);
    			add_location(span2, file$4, 49, 2, 1399);
    			add_location(span3, file$4, 49, 24, 1421);
    			add_location(span4, file$4, 50, 2, 1450);
    			add_location(span5, file$4, 50, 20, 1468);
    			attr_dev(div, "class", "status svelte-on3dhk");
    			add_location(div, file$4, 47, 1, 1327);
    			attr_dev(main, "class", "svelte-on3dhk");
    			add_location(main, file$4, 45, 0, 1275);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div);
    			append_dev(div, span0);
    			append_dev(div, span1);
    			append_dev(span1, t1);
    			append_dev(div, t2);
    			append_dev(div, span2);
    			append_dev(div, span3);
    			append_dev(span3, t4);
    			append_dev(div, t5);
    			append_dev(div, span4);
    			append_dev(div, span5);
    			append_dev(span5, t7);
    			append_dev(main, t8);

    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].m(main, null);
    			}

    			current = true;

    			dispose = [
    				listen_dev(window_1, "keydown", /*handleKeydown*/ ctx[7], false, false, false),
    				listen_dev(window_1, "scroll", () => {
    					scrolling = true;
    					clearTimeout(scrolling_timeout);
    					scrolling_timeout = setTimeout(clear_scrolling, 100);
    					/*onwindowscroll*/ ctx[9]();
    				}),
    				listen_dev(window_1, "resize", /*onwindowresize*/ ctx[10])
    			];
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*x, y*/ 6 && !scrolling) {
    				scrolling = true;
    				clearTimeout(scrolling_timeout);
    				scrollTo(/*x*/ ctx[2], /*y*/ ctx[1]);
    				scrolling_timeout = setTimeout(clear_scrolling, 100);
    			}

    			if ((!current || dirty & /*y*/ 2) && t1_value !== (t1_value = Math.round(/*y*/ ctx[1]) + "")) set_data_dev(t1, t1_value);
    			if (!current || dirty & /*isScrolling*/ 32) set_data_dev(t4, /*isScrolling*/ ctx[5]);
    			if ((!current || dirty & /*sceneIndex*/ 1) && t7_value !== (t7_value = /*scenes*/ ctx[6][/*sceneIndex*/ ctx[0]] + "")) set_data_dev(t7, t7_value);
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if (~current_block_type_index) {
    					if_blocks[current_block_type_index].p(ctx, dirty);
    				}
    			} else {
    				if (if_block) {
    					group_outros();

    					transition_out(if_blocks[previous_block_index], 1, 1, () => {
    						if_blocks[previous_block_index] = null;
    					});

    					check_outros();
    				}

    				if (~current_block_type_index) {
    					if_block = if_blocks[current_block_type_index];

    					if (!if_block) {
    						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    						if_block.c();
    					}

    					transition_in(if_block, 1);
    					if_block.m(main, null);
    				} else {
    					if_block = null;
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);

    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].d();
    			}

    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let scenes = ["climb", "jump", "fall", "swim"];

    	//current scene is..
    	let sceneIndex = 0;

    	//window properties
    	let y, x, h, w;

    	//switch scenes by typing a number 0, 1, 2, 3 etc..
    	const handleKeydown = e => {
    		if (!isNaN(e.key) && e.key < scenes.length) changeScene(e.key);
    	};

    	//scroll handlers - see the status window 
    	let isScrolling = false;

    	window.addEventListener("scroll", () => $$invalidate(5, isScrolling = true));

    	//change scene function - is called either on keypress or by the modules, whenever they dispatch 'done'
    	const changeScene = nr => {
    		//reset scroll
    		$$invalidate(1, y = 0);

    		window.scrollTo(0, 0);

    		if (!isNaN(nr)) {
    			$$invalidate(0, sceneIndex = nr);
    			return;
    		}

    		$$invalidate(0, sceneIndex = sceneIndex == scenes.length ? 0 : sceneIndex + 1);
    	};

    	function onwindowscroll() {
    		$$invalidate(2, x = window_1.pageXOffset);
    		$$invalidate(1, y = window_1.pageYOffset);
    	}

    	function onwindowresize() {
    		$$invalidate(3, h = window_1.innerHeight);
    		$$invalidate(4, w = window_1.innerWidth);
    	}

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("scenes" in $$props) $$invalidate(6, scenes = $$props.scenes);
    		if ("sceneIndex" in $$props) $$invalidate(0, sceneIndex = $$props.sceneIndex);
    		if ("y" in $$props) $$invalidate(1, y = $$props.y);
    		if ("x" in $$props) $$invalidate(2, x = $$props.x);
    		if ("h" in $$props) $$invalidate(3, h = $$props.h);
    		if ("w" in $$props) $$invalidate(4, w = $$props.w);
    		if ("isScrolling" in $$props) $$invalidate(5, isScrolling = $$props.isScrolling);
    	};

    	 scrollStop(() => $$invalidate(5, isScrolling = false));

    	return [
    		sceneIndex,
    		y,
    		x,
    		h,
    		w,
    		isScrolling,
    		scenes,
    		handleKeydown,
    		changeScene,
    		onwindowscroll,
    		onwindowresize
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
