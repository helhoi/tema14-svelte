
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
    function empty() {
        return text('');
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
    function create_in_transition(node, fn, params) {
        let config = fn(node, params);
        let running = false;
        let animation_name;
        let task;
        let uid = 0;
        function cleanup() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function go() {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            if (css)
                animation_name = create_rule(node, 0, 1, duration, delay, easing, css, uid++);
            tick(0, 1);
            const start_time = now() + delay;
            const end_time = start_time + duration;
            if (task)
                task.abort();
            running = true;
            add_render_callback(() => dispatch(node, true, 'start'));
            task = loop(now => {
                if (running) {
                    if (now >= end_time) {
                        tick(1, 0);
                        dispatch(node, true, 'end');
                        cleanup();
                        return running = false;
                    }
                    if (now >= start_time) {
                        const t = easing((now - start_time) / duration);
                        tick(t, 1 - t);
                    }
                }
                return running;
            });
        }
        let started = false;
        return {
            start() {
                if (started)
                    return;
                delete_rule(node);
                if (is_function(config)) {
                    config = config();
                    wait().then(go);
                }
                else {
                    go();
                }
            },
            invalidate() {
                started = false;
            },
            end() {
                if (running) {
                    cleanup();
                    running = false;
                }
            }
        };
    }
    function create_out_transition(node, fn, params) {
        let config = fn(node, params);
        let running = true;
        let animation_name;
        const group = outros;
        group.r += 1;
        function go() {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            if (css)
                animation_name = create_rule(node, 1, 0, duration, delay, easing, css);
            const start_time = now() + delay;
            const end_time = start_time + duration;
            add_render_callback(() => dispatch(node, false, 'start'));
            loop(now => {
                if (running) {
                    if (now >= end_time) {
                        tick(0, 1);
                        dispatch(node, false, 'end');
                        if (!--group.r) {
                            // this will result in `end()` being called,
                            // so we don't need to clean up here
                            run_all(group.c);
                        }
                        return false;
                    }
                    if (now >= start_time) {
                        const t = easing((now - start_time) / duration);
                        tick(1 - t, t);
                    }
                }
                return running;
            });
        }
        if (is_function(config)) {
            wait().then(() => {
                // @ts-ignore
                config = config();
                go();
            });
        }
        else {
            go();
        }
        return {
            end(reset) {
                if (reset && config.tick) {
                    config.tick(1, 0);
                }
                if (running) {
                    if (animation_name)
                        delete_rule(node, animation_name);
                    running = false;
                }
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
    	let img;
    	let img_src_value;

    	const block = {
    		c: function create() {
    			section = element("section");
    			h3 = element("h3");
    			h3.textContent = "scroll to climb..";
    			t1 = space();
    			img = element("img");
    			attr_dev(h3, "class", "svelte-7ac3ds");
    			add_location(h3, file, 29, 4, 1139);
    			if (img.src !== (img_src_value = "./img/even/stige.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "class", "stige svelte-7ac3ds");
    			attr_dev(img, "alt", "title");
    			add_location(img, file, 30, 4, 1170);
    			add_location(section, file, 28, 0, 1125);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, h3);
    			append_dev(section, t1);
    			append_dev(section, img);
    			/*img_binding*/ ctx[6](img);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    			/*img_binding*/ ctx[6](null);
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
    	let ladder, diver;

    	const writable_props = ["scroll", "isScrolling"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<Climb> was created with unknown prop '${key}'`);
    	});

    	function img_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(0, ladder = $$value);
    		});
    	}

    	$$self.$set = $$props => {
    		if ("scroll" in $$props) $$invalidate(1, scroll = $$props.scroll);
    		if ("isScrolling" in $$props) $$invalidate(2, isScrolling = $$props.isScrolling);
    	};

    	$$self.$capture_state = () => {
    		return { scroll, isScrolling, ladder, diver, src };
    	};

    	$$self.$inject_state = $$props => {
    		if ("scroll" in $$props) $$invalidate(1, scroll = $$props.scroll);
    		if ("isScrolling" in $$props) $$invalidate(2, isScrolling = $$props.isScrolling);
    		if ("ladder" in $$props) $$invalidate(0, ladder = $$props.ladder);
    		if ("diver" in $$props) diver = $$props.diver;
    		if ("src" in $$props) src = $$props.src;
    	};

    	let src;

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*isScrolling*/ 4) {
    			// a reactive var: src always checks whether isScrolling is true or false, and can thus be used to trigger shift between the images 
    			 src = isScrolling
    			? "./img/climber.gif"
    			: "./img/climber_still.png";
    		}

    		if ($$self.$$.dirty & /*ladder, scroll*/ 3) {
    			// an anonymous reactive variable checks the position of the two images and dispatches 'done', when the climber has reached a certain distance to the top of the latter (change 150 to something else to tweak)
    			 {
    				if (ladder) {
    					$$invalidate(0, ladder.style.transform = `translateY(${scroll / 12}px)`, ladder);

    					if (scroll >= 4179) {
    						console.log("stige sin topp er nå: ", ladder.getBoundingClientRect().top);
    						console.log("ready to jump..");
    						dispatch("done");
    					}
    				}
    			}
    		}
    	};

    	return [ladder, scroll, isScrolling, src, dispatch, diver, img_binding];
    }

    class Climb extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { scroll: 1, isScrolling: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Climb",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*scroll*/ ctx[1] === undefined && !("scroll" in props)) {
    			console_1.warn("<Climb> was created without expected prop 'scroll'");
    		}

    		if (/*isScrolling*/ ctx[2] === undefined && !("isScrolling" in props)) {
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

    /* src/components/Man.svelte generated by Svelte v3.18.2 */

    const { console: console_1$1 } = globals;
    const file$1 = "src/components/Man.svelte";

    function create_fragment$1(ctx) {
    	let div;
    	let img;
    	let img_src_value;
    	let div_intro;
    	let div_outro;
    	let current;

    	const block = {
    		c: function create() {
    			div = element("div");
    			img = element("img");
    			if (img.src !== (img_src_value = /*src*/ ctx[0])) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "class", "man svelte-1ooy380");
    			attr_dev(img, "alt", "manny");
    			add_location(img, file$1, 21, 4, 534);
    			add_location(div, file$1, 20, 0, 507);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, img);
    			/*img_binding*/ ctx[5](img);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*src*/ 1 && img.src !== (img_src_value = /*src*/ ctx[0])) {
    				attr_dev(img, "src", img_src_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (div_outro) div_outro.end(1);
    				if (!div_intro) div_intro = create_in_transition(div, fade, {});
    				div_intro.start();
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			if (div_intro) div_intro.invalidate();
    			div_outro = create_out_transition(div, fade, {});
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			/*img_binding*/ ctx[5](null);
    			if (detaching && div_outro) div_outro.end();
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
    	let { src } = $$props, { moveUp } = $$props, { moveForward } = $$props;
    	let { scroll = 0 } = $$props;
    	let man;
    	const writable_props = ["src", "moveUp", "moveForward", "scroll"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1$1.warn(`<Man> was created with unknown prop '${key}'`);
    	});

    	function img_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(1, man = $$value);
    		});
    	}

    	$$self.$set = $$props => {
    		if ("src" in $$props) $$invalidate(0, src = $$props.src);
    		if ("moveUp" in $$props) $$invalidate(2, moveUp = $$props.moveUp);
    		if ("moveForward" in $$props) $$invalidate(3, moveForward = $$props.moveForward);
    		if ("scroll" in $$props) $$invalidate(4, scroll = $$props.scroll);
    	};

    	$$self.$capture_state = () => {
    		return { src, moveUp, moveForward, scroll, man };
    	};

    	$$self.$inject_state = $$props => {
    		if ("src" in $$props) $$invalidate(0, src = $$props.src);
    		if ("moveUp" in $$props) $$invalidate(2, moveUp = $$props.moveUp);
    		if ("moveForward" in $$props) $$invalidate(3, moveForward = $$props.moveForward);
    		if ("scroll" in $$props) $$invalidate(4, scroll = $$props.scroll);
    		if ("man" in $$props) $$invalidate(1, man = $$props.man);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*man, moveForward, moveUp, scroll*/ 30) {
    			 {
    				if (man) {
    					$$invalidate(3, moveForward = moveForward ? moveForward : 0);
    					$$invalidate(2, moveUp = moveUp ? moveUp : 0);
    					$$invalidate(1, man.style.transform = `translate(${moveForward}px, ${moveUp}px)`, man);
    				}

    				if (scroll > 7000) {
    					console.log(man.style.opacity);
    					$$invalidate(1, man.style.opacity = (8000 - scroll) / 1000, man);
    				}
    			}
    		}
    	};

    	return [src, man, moveUp, moveForward, scroll, img_binding];
    }

    class Man extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {
    			src: 0,
    			moveUp: 2,
    			moveForward: 3,
    			scroll: 4
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Man",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*src*/ ctx[0] === undefined && !("src" in props)) {
    			console_1$1.warn("<Man> was created without expected prop 'src'");
    		}

    		if (/*moveUp*/ ctx[2] === undefined && !("moveUp" in props)) {
    			console_1$1.warn("<Man> was created without expected prop 'moveUp'");
    		}

    		if (/*moveForward*/ ctx[3] === undefined && !("moveForward" in props)) {
    			console_1$1.warn("<Man> was created without expected prop 'moveForward'");
    		}
    	}

    	get src() {
    		throw new Error("<Man>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set src(value) {
    		throw new Error("<Man>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get moveUp() {
    		throw new Error("<Man>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set moveUp(value) {
    		throw new Error("<Man>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get moveForward() {
    		throw new Error("<Man>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set moveForward(value) {
    		throw new Error("<Man>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get scroll() {
    		throw new Error("<Man>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set scroll(value) {
    		throw new Error("<Man>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/Jump.svelte generated by Svelte v3.18.2 */
    const file$2 = "src/components/Jump.svelte";

    // (56:28) 
    function create_if_block_13(ctx) {
    	let current;

    	const man_1 = new Man({
    			props: {
    				scroll: /*scroll*/ ctx[0],
    				src: "./img/even/vann4.png",
    				moveUp: "250",
    				moveForward: "-400"
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(man_1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(man_1, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const man_1_changes = {};
    			if (dirty & /*scroll*/ 1) man_1_changes.scroll = /*scroll*/ ctx[0];
    			man_1.$set(man_1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(man_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(man_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(man_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_13.name,
    		type: "if",
    		source: "(56:28) ",
    		ctx
    	});

    	return block;
    }

    // (54:48) 
    function create_if_block_12(ctx) {
    	let current;

    	const man_1 = new Man({
    			props: {
    				src: "./img/even/vann3.png",
    				moveUp: "250",
    				moveForward: "-400"
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(man_1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(man_1, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(man_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(man_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(man_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_12.name,
    		type: "if",
    		source: "(54:48) ",
    		ctx
    	});

    	return block;
    }

    // (52:47) 
    function create_if_block_11(ctx) {
    	let current;

    	const man_1 = new Man({
    			props: {
    				src: "./img/even/vann2.png",
    				moveUp: "250",
    				moveForward: "-400"
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(man_1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(man_1, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(man_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(man_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(man_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_11.name,
    		type: "if",
    		source: "(52:47) ",
    		ctx
    	});

    	return block;
    }

    // (50:47) 
    function create_if_block_10(ctx) {
    	let current;

    	const man_1 = new Man({
    			props: {
    				src: "./img/even/vann1.png",
    				moveUp: "250",
    				moveForward: "-400"
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(man_1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(man_1, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(man_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(man_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(man_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_10.name,
    		type: "if",
    		source: "(50:47) ",
    		ctx
    	});

    	return block;
    }

    // (47:48) 
    function create_if_block_9(ctx) {
    	let current;

    	const man_1 = new Man({
    			props: {
    				src: "./img/even/9.png",
    				moveUp: "250",
    				moveForward: "-400"
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(man_1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(man_1, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(man_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(man_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(man_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_9.name,
    		type: "if",
    		source: "(47:48) ",
    		ctx
    	});

    	return block;
    }

    // (45:48) 
    function create_if_block_8(ctx) {
    	let current;

    	const man_1 = new Man({
    			props: {
    				src: "./img/even/9.png",
    				moveUp: "250",
    				moveForward: "-400"
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(man_1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(man_1, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(man_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(man_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(man_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_8.name,
    		type: "if",
    		source: "(45:48) ",
    		ctx
    	});

    	return block;
    }

    // (43:47) 
    function create_if_block_7(ctx) {
    	let current;

    	const man_1 = new Man({
    			props: {
    				src: "./img/even/8.png",
    				moveUp: "250",
    				moveForward: "-400"
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(man_1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(man_1, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(man_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(man_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(man_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_7.name,
    		type: "if",
    		source: "(43:47) ",
    		ctx
    	});

    	return block;
    }

    // (41:48) 
    function create_if_block_6(ctx) {
    	let current;

    	const man_1 = new Man({
    			props: {
    				src: "./img/even/7.png",
    				moveUp: "250",
    				moveForward: "-400"
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(man_1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(man_1, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(man_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(man_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(man_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_6.name,
    		type: "if",
    		source: "(41:48) ",
    		ctx
    	});

    	return block;
    }

    // (39:47) 
    function create_if_block_5(ctx) {
    	let current;

    	const man_1 = new Man({
    			props: {
    				src: "./img/even/6.png",
    				moveForward: "-230",
    				moveUp: "-25"
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(man_1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(man_1, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(man_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(man_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(man_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5.name,
    		type: "if",
    		source: "(39:47) ",
    		ctx
    	});

    	return block;
    }

    // (37:48) 
    function create_if_block_4(ctx) {
    	let current;

    	const man_1 = new Man({
    			props: {
    				src: "./img/even/5.png",
    				moveForward: "-130",
    				moveUp: "-25"
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(man_1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(man_1, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(man_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(man_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(man_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(37:48) ",
    		ctx
    	});

    	return block;
    }

    // (35:48) 
    function create_if_block_3(ctx) {
    	let current;

    	const man_1 = new Man({
    			props: {
    				src: "./img/even/4.png",
    				moveForward: "-130",
    				moveUp: "-25"
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(man_1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(man_1, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(man_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(man_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(man_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(35:48) ",
    		ctx
    	});

    	return block;
    }

    // (33:46) 
    function create_if_block_2(ctx) {
    	let current;

    	const man_1 = new Man({
    			props: {
    				src: "./img/even/3.png",
    				moveForward: "-100"
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(man_1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(man_1, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(man_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(man_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(man_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(33:46) ",
    		ctx
    	});

    	return block;
    }

    // (31:45) 
    function create_if_block_1(ctx) {
    	let current;

    	const man_1 = new Man({
    			props: { src: "./img/even/2.png" },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(man_1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(man_1, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(man_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(man_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(man_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(31:45) ",
    		ctx
    	});

    	return block;
    }

    // (29:4) {#if scroll <= 500}
    function create_if_block(ctx) {
    	let current;

    	const man_1 = new Man({
    			props: { src: "./img/even/1.png", moveUp: "100" },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(man_1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(man_1, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(man_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(man_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(man_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(29:4) {#if scroll <= 500}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let section;
    	let current_block_type_index;
    	let if_block;
    	let t0;
    	let img0;
    	let img0_src_value;
    	let t1;
    	let img1;
    	let img1_src_value;
    	let current;

    	const if_block_creators = [
    		create_if_block,
    		create_if_block_1,
    		create_if_block_2,
    		create_if_block_3,
    		create_if_block_4,
    		create_if_block_5,
    		create_if_block_6,
    		create_if_block_7,
    		create_if_block_8,
    		create_if_block_9,
    		create_if_block_10,
    		create_if_block_11,
    		create_if_block_12,
    		create_if_block_13
    	];

    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*scroll*/ ctx[0] <= 500) return 0;
    		if (/*scroll*/ ctx[0] >= 500 && /*scroll*/ ctx[0] <= 800) return 1;
    		if (/*scroll*/ ctx[0] >= 801 && /*scroll*/ ctx[0] <= 1000) return 2;
    		if (/*scroll*/ ctx[0] >= 1001 && /*scroll*/ ctx[0] <= 1300) return 3;
    		if (/*scroll*/ ctx[0] >= 1301 && /*scroll*/ ctx[0] <= 1500) return 4;
    		if (/*scroll*/ ctx[0] >= 1501 && /*scroll*/ ctx[0] <= 1800) return 5;
    		if (/*scroll*/ ctx[0] >= 1801 && /*scroll*/ ctx[0] <= 2000) return 6;
    		if (/*scroll*/ ctx[0] >= 2001 && /*scroll*/ ctx[0] <= 2300) return 7;
    		if (/*scroll*/ ctx[0] >= 2301 && /*scroll*/ ctx[0] <= 2600) return 8;
    		if (/*scroll*/ ctx[0] >= 2600 && /*scroll*/ ctx[0] <= 3959) return 9;
    		if (/*scroll*/ ctx[0] >= 3960 && /*scroll*/ ctx[0] <= 4100) return 10;
    		if (/*scroll*/ ctx[0] >= 4001 && /*scroll*/ ctx[0] <= 4300) return 11;
    		if (/*scroll*/ ctx[0] >= 4301 && /*scroll*/ ctx[0] <= 4600) return 12;
    		if (/*scroll*/ ctx[0] > 4601) return 13;
    		return -1;
    	}

    	if (~(current_block_type_index = select_block_type(ctx))) {
    		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	}

    	const block = {
    		c: function create() {
    			section = element("section");
    			if (if_block) if_block.c();
    			t0 = space();
    			img0 = element("img");
    			t1 = space();
    			img1 = element("img");
    			if (img0.src !== (img0_src_value = "./img/even/langstige.png")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "class", "stige svelte-1wnzgo6");
    			attr_dev(img0, "alt", "title");
    			add_location(img0, file$2, 61, 4, 2182);
    			if (img1.src !== (img1_src_value = "./img/even/bakgrunn.png")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "title");
    			attr_dev(img1, "class", "land svelte-1wnzgo6");
    			add_location(img1, file$2, 62, 4, 2270);
    			add_location(section, file$2, 26, 0, 562);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);

    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].m(section, null);
    			}

    			append_dev(section, t0);
    			append_dev(section, img0);
    			/*img0_binding*/ ctx[7](img0);
    			append_dev(section, t1);
    			append_dev(section, img1);
    			/*img1_binding*/ ctx[8](img1);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
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
    					if_block.m(section, t0);
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
    			if (detaching) detach_dev(section);

    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].d();
    			}

    			/*img0_binding*/ ctx[7](null);
    			/*img1_binding*/ ctx[8](null);
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

    function instance$2($$self, $$props, $$invalidate) {
    	const dispatch = createEventDispatcher();
    	let { scroll } = $$props, { width } = $$props;
    	let man, manIsDangerouslyCloseToTheEnd = false;
    	let ladder;
    	let land;
    	const writable_props = ["scroll", "width"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Jump> was created with unknown prop '${key}'`);
    	});

    	function img0_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(1, ladder = $$value);
    		});
    	}

    	function img1_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(2, land = $$value);
    		});
    	}

    	$$self.$set = $$props => {
    		if ("scroll" in $$props) $$invalidate(0, scroll = $$props.scroll);
    		if ("width" in $$props) $$invalidate(3, width = $$props.width);
    	};

    	$$self.$capture_state = () => {
    		return {
    			scroll,
    			width,
    			man,
    			manIsDangerouslyCloseToTheEnd,
    			ladder,
    			land
    		};
    	};

    	$$self.$inject_state = $$props => {
    		if ("scroll" in $$props) $$invalidate(0, scroll = $$props.scroll);
    		if ("width" in $$props) $$invalidate(3, width = $$props.width);
    		if ("man" in $$props) man = $$props.man;
    		if ("manIsDangerouslyCloseToTheEnd" in $$props) manIsDangerouslyCloseToTheEnd = $$props.manIsDangerouslyCloseToTheEnd;
    		if ("ladder" in $$props) $$invalidate(1, ladder = $$props.ladder);
    		if ("land" in $$props) $$invalidate(2, land = $$props.land);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*scroll*/ 1) {
    			 {
    				if (scroll > 2001) {
    					$$invalidate(1, ladder.style.transform = `translateY(-${(scroll - 2001) * 0.6}px)`, ladder);
    					$$invalidate(2, land.style.transform = `translateY(-${scroll - 2001}px)`, land);
    				}

    				if (scroll > 5000) {
    					$$invalidate(1, ladder.style.opacity = (6000 - scroll) / 1000, ladder);
    				}
    			}
    		}
    	};

    	return [
    		scroll,
    		ladder,
    		land,
    		width,
    		dispatch,
    		man,
    		manIsDangerouslyCloseToTheEnd,
    		img0_binding,
    		img1_binding
    	];
    }

    class Jump extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { scroll: 0, width: 3 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Jump",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*scroll*/ ctx[0] === undefined && !("scroll" in props)) {
    			console.warn("<Jump> was created without expected prop 'scroll'");
    		}

    		if (/*width*/ ctx[3] === undefined && !("width" in props)) {
    			console.warn("<Jump> was created without expected prop 'width'");
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

    /* src/components/KellyMan.svelte generated by Svelte v3.18.2 */
    const file$3 = "src/components/KellyMan.svelte";

    function create_fragment$3(ctx) {
    	let div;
    	let img;
    	let img_src_value;
    	let div_intro;
    	let div_outro;
    	let current;

    	const block = {
    		c: function create() {
    			div = element("div");
    			img = element("img");
    			if (img.src !== (img_src_value = /*src*/ ctx[0])) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "class", "man svelte-guocq3");
    			attr_dev(img, "alt", "manny");
    			add_location(img, file$3, 16, 4, 387);
    			add_location(div, file$3, 15, 0, 360);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, img);
    			/*img_binding*/ ctx[4](img);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*src*/ 1 && img.src !== (img_src_value = /*src*/ ctx[0])) {
    				attr_dev(img, "src", img_src_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (div_outro) div_outro.end(1);
    				if (!div_intro) div_intro = create_in_transition(div, fade, {});
    				div_intro.start();
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			if (div_intro) div_intro.invalidate();
    			div_outro = create_out_transition(div, fade, {});
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			/*img_binding*/ ctx[4](null);
    			if (detaching && div_outro) div_outro.end();
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

    function instance$3($$self, $$props, $$invalidate) {
    	let { src } = $$props, { moveUp } = $$props, { moveForward } = $$props;
    	let kellyman;
    	const writable_props = ["src", "moveUp", "moveForward"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<KellyMan> was created with unknown prop '${key}'`);
    	});

    	function img_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(1, kellyman = $$value);
    		});
    	}

    	$$self.$set = $$props => {
    		if ("src" in $$props) $$invalidate(0, src = $$props.src);
    		if ("moveUp" in $$props) $$invalidate(2, moveUp = $$props.moveUp);
    		if ("moveForward" in $$props) $$invalidate(3, moveForward = $$props.moveForward);
    	};

    	$$self.$capture_state = () => {
    		return { src, moveUp, moveForward, kellyman };
    	};

    	$$self.$inject_state = $$props => {
    		if ("src" in $$props) $$invalidate(0, src = $$props.src);
    		if ("moveUp" in $$props) $$invalidate(2, moveUp = $$props.moveUp);
    		if ("moveForward" in $$props) $$invalidate(3, moveForward = $$props.moveForward);
    		if ("kellyman" in $$props) $$invalidate(1, kellyman = $$props.kellyman);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*kellyman, moveForward, moveUp*/ 14) {
    			 {
    				if (kellyman) {
    					$$invalidate(3, moveForward = moveForward ? moveForward : 0);
    					$$invalidate(2, moveUp = moveUp ? moveUp : 0);
    					$$invalidate(1, kellyman.style.transform = `translate(${moveForward}px, ${moveUp}px)`, kellyman);
    				}
    			}
    		}
    	};

    	return [src, kellyman, moveUp, moveForward, img_binding];
    }

    class KellyMan extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { src: 0, moveUp: 2, moveForward: 3 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "KellyMan",
    			options,
    			id: create_fragment$3.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*src*/ ctx[0] === undefined && !("src" in props)) {
    			console.warn("<KellyMan> was created without expected prop 'src'");
    		}

    		if (/*moveUp*/ ctx[2] === undefined && !("moveUp" in props)) {
    			console.warn("<KellyMan> was created without expected prop 'moveUp'");
    		}

    		if (/*moveForward*/ ctx[3] === undefined && !("moveForward" in props)) {
    			console.warn("<KellyMan> was created without expected prop 'moveForward'");
    		}
    	}

    	get src() {
    		throw new Error("<KellyMan>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set src(value) {
    		throw new Error("<KellyMan>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get moveUp() {
    		throw new Error("<KellyMan>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set moveUp(value) {
    		throw new Error("<KellyMan>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get moveForward() {
    		throw new Error("<KellyMan>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set moveForward(value) {
    		throw new Error("<KellyMan>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/KellyWorld.svelte generated by Svelte v3.18.2 */
    const file$4 = "src/components/KellyWorld.svelte";

    // (38:28) 
    function create_if_block_6$1(ctx) {
    	let current;

    	const kellyman_1 = new KellyMan({
    			props: {
    				src: "./img/kelly/7klein.png",
    				moveUp: "400",
    				moveForward: "-600"
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(kellyman_1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(kellyman_1, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(kellyman_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(kellyman_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(kellyman_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_6$1.name,
    		type: "if",
    		source: "(38:28) ",
    		ctx
    	});

    	return block;
    }

    // (36:47) 
    function create_if_block_5$1(ctx) {
    	let current;

    	const kellyman_1 = new KellyMan({
    			props: {
    				src: "./img/kelly/6sklir.png",
    				moveUp: "150",
    				moveForward: "-300"
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(kellyman_1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(kellyman_1, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(kellyman_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(kellyman_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(kellyman_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5$1.name,
    		type: "if",
    		source: "(36:47) ",
    		ctx
    	});

    	return block;
    }

    // (34:47) 
    function create_if_block_4$1(ctx) {
    	let current;

    	const kellyman_1 = new KellyMan({
    			props: {
    				src: "./img/kelly/5Ser.png",
    				moveUp: "80",
    				moveForward: "-230"
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(kellyman_1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(kellyman_1, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(kellyman_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(kellyman_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(kellyman_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4$1.name,
    		type: "if",
    		source: "(34:47) ",
    		ctx
    	});

    	return block;
    }

    // (32:47) 
    function create_if_block_3$1(ctx) {
    	let current;

    	const kellyman_1 = new KellyMan({
    			props: {
    				src: "./img/kelly/4frykt.png",
    				moveUp: "80",
    				moveForward: "-200"
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(kellyman_1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(kellyman_1, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(kellyman_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(kellyman_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(kellyman_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3$1.name,
    		type: "if",
    		source: "(32:47) ",
    		ctx
    	});

    	return block;
    }

    // (30:47) 
    function create_if_block_2$1(ctx) {
    	let current;

    	const kellyman_1 = new KellyMan({
    			props: {
    				src: "./img/kelly/3står.png",
    				moveUp: "80",
    				moveForward: "-200"
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(kellyman_1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(kellyman_1, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(kellyman_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(kellyman_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(kellyman_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$1.name,
    		type: "if",
    		source: "(30:47) ",
    		ctx
    	});

    	return block;
    }

    // (28:47) 
    function create_if_block_1$1(ctx) {
    	let current;

    	const kellyman_1 = new KellyMan({
    			props: {
    				src: "./img/kelly/2lander.png",
    				moveUp: "80",
    				moveForward: "-200"
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(kellyman_1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(kellyman_1, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(kellyman_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(kellyman_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(kellyman_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(28:47) ",
    		ctx
    	});

    	return block;
    }

    // (26:4) {#if scroll <= 500}
    function create_if_block$1(ctx) {
    	let current;

    	const kellyman_1 = new KellyMan({
    			props: {
    				src: "./img/kelly/1lander.png",
    				moveUp: "-100",
    				moveForward: "-130"
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(kellyman_1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(kellyman_1, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(kellyman_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(kellyman_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(kellyman_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(26:4) {#if scroll <= 500}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let section;
    	let current_block_type_index;
    	let if_block;
    	let t0;
    	let img0;
    	let img0_src_value;
    	let t1;
    	let img1;
    	let img1_src_value;
    	let current;

    	const if_block_creators = [
    		create_if_block$1,
    		create_if_block_1$1,
    		create_if_block_2$1,
    		create_if_block_3$1,
    		create_if_block_4$1,
    		create_if_block_5$1,
    		create_if_block_6$1
    	];

    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*scroll*/ ctx[0] <= 500) return 0;
    		if (/*scroll*/ ctx[0] >= 501 && /*scroll*/ ctx[0] <= 1000) return 1;
    		if (/*scroll*/ ctx[0] >= 1001 && /*scroll*/ ctx[0] <= 1500) return 2;
    		if (/*scroll*/ ctx[0] >= 1501 && /*scroll*/ ctx[0] <= 2000) return 3;
    		if (/*scroll*/ ctx[0] >= 2001 && /*scroll*/ ctx[0] <= 2500) return 4;
    		if (/*scroll*/ ctx[0] >= 2501 && /*scroll*/ ctx[0] <= 3000) return 5;
    		if (/*scroll*/ ctx[0] > 4601) return 6;
    		return -1;
    	}

    	if (~(current_block_type_index = select_block_type(ctx))) {
    		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	}

    	const block = {
    		c: function create() {
    			section = element("section");
    			if (if_block) if_block.c();
    			t0 = space();
    			img0 = element("img");
    			t1 = space();
    			img1 = element("img");
    			if (img0.src !== (img0_src_value = "./img/kelly/langstige.png")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "class", "stige svelte-rx3xqa");
    			attr_dev(img0, "alt", "title");
    			add_location(img0, file$4, 41, 4, 1257);
    			if (img1.src !== (img1_src_value = "./img/kelly/bkgr-land.png")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "class", "land svelte-rx3xqa");
    			attr_dev(img1, "alt", "background");
    			add_location(img1, file$4, 42, 4, 1346);
    			attr_dev(section, "class", "svelte-rx3xqa");
    			add_location(section, file$4, 23, 0, 369);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);

    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].m(section, null);
    			}

    			append_dev(section, t0);
    			append_dev(section, img0);
    			/*img0_binding*/ ctx[7](img0);
    			append_dev(section, t1);
    			append_dev(section, img1);
    			/*img1_binding*/ ctx[8](img1);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index !== previous_block_index) {
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
    					if_block.m(section, t0);
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
    			if (detaching) detach_dev(section);

    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].d();
    			}

    			/*img0_binding*/ ctx[7](null);
    			/*img1_binding*/ ctx[8](null);
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

    function instance$4($$self, $$props, $$invalidate) {
    	const dispatch = createEventDispatcher();
    	let { scroll } = $$props, { width } = $$props;
    	let kellyman, manIsDangerouslyCloseToTheEnd = false;
    	let land;
    	let ladder;
    	const writable_props = ["scroll", "width"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<KellyWorld> was created with unknown prop '${key}'`);
    	});

    	function img0_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(2, ladder = $$value);
    		});
    	}

    	function img1_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(1, land = $$value);
    		});
    	}

    	$$self.$set = $$props => {
    		if ("scroll" in $$props) $$invalidate(0, scroll = $$props.scroll);
    		if ("width" in $$props) $$invalidate(3, width = $$props.width);
    	};

    	$$self.$capture_state = () => {
    		return {
    			scroll,
    			width,
    			kellyman,
    			manIsDangerouslyCloseToTheEnd,
    			land,
    			ladder
    		};
    	};

    	$$self.$inject_state = $$props => {
    		if ("scroll" in $$props) $$invalidate(0, scroll = $$props.scroll);
    		if ("width" in $$props) $$invalidate(3, width = $$props.width);
    		if ("kellyman" in $$props) kellyman = $$props.kellyman;
    		if ("manIsDangerouslyCloseToTheEnd" in $$props) manIsDangerouslyCloseToTheEnd = $$props.manIsDangerouslyCloseToTheEnd;
    		if ("land" in $$props) $$invalidate(1, land = $$props.land);
    		if ("ladder" in $$props) $$invalidate(2, ladder = $$props.ladder);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*scroll*/ 1) {
    			 {
    				if (scroll >= 3000) {
    					dispatch("done");
    				}
    			}
    		}
    	};

    	return [
    		scroll,
    		land,
    		ladder,
    		width,
    		dispatch,
    		kellyman,
    		manIsDangerouslyCloseToTheEnd,
    		img0_binding,
    		img1_binding
    	];
    }

    class KellyWorld extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, { scroll: 0, width: 3 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "KellyWorld",
    			options,
    			id: create_fragment$4.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*scroll*/ ctx[0] === undefined && !("scroll" in props)) {
    			console.warn("<KellyWorld> was created without expected prop 'scroll'");
    		}

    		if (/*width*/ ctx[3] === undefined && !("width" in props)) {
    			console.warn("<KellyWorld> was created without expected prop 'width'");
    		}
    	}

    	get scroll() {
    		throw new Error("<KellyWorld>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set scroll(value) {
    		throw new Error("<KellyWorld>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get width() {
    		throw new Error("<KellyWorld>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set width(value) {
    		throw new Error("<KellyWorld>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/KellyUnderwater.svelte generated by Svelte v3.18.2 */
    const file$5 = "src/components/KellyUnderwater.svelte";

    // (27:4) {#if scroll >= 1}
    function create_if_block$2(ctx) {
    	let current;

    	const kellyman_1 = new KellyMan({
    			props: {
    				src: "./img/kelly/5Ser.png",
    				moveUp: "130"
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(kellyman_1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(kellyman_1, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(kellyman_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(kellyman_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(kellyman_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(27:4) {#if scroll >= 1}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$5(ctx) {
    	let section;
    	let t0;
    	let img0;
    	let img0_src_value;
    	let t1;
    	let img1;
    	let img1_src_value;
    	let t2;
    	let img2;
    	let img2_src_value;
    	let t3;
    	let img3;
    	let img3_src_value;
    	let current;
    	let if_block = /*scroll*/ ctx[0] >= 1 && create_if_block$2(ctx);

    	const block = {
    		c: function create() {
    			section = element("section");
    			if (if_block) if_block.c();
    			t0 = space();
    			img0 = element("img");
    			t1 = space();
    			img1 = element("img");
    			t2 = space();
    			img2 = element("img");
    			t3 = space();
    			img3 = element("img");
    			if (img0.src !== (img0_src_value = "./img/kelly/bkgr-vann.png")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "class", "vann svelte-az687v");
    			attr_dev(img0, "alt", "Background");
    			add_location(img0, file$5, 30, 4, 513);
    			if (img1.src !== (img1_src_value = "./img/kelly/parallax1.png")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "class", "parallax1 svelte-az687v");
    			attr_dev(img1, "alt", "Background");
    			add_location(img1, file$5, 31, 4, 604);
    			if (img2.src !== (img2_src_value = "./img/kelly/parallax2.png")) attr_dev(img2, "src", img2_src_value);
    			attr_dev(img2, "class", "parallax2 svelte-az687v");
    			attr_dev(img2, "alt", "Background");
    			add_location(img2, file$5, 32, 4, 705);
    			if (img3.src !== (img3_src_value = "./img/kelly/detaljer.png")) attr_dev(img3, "src", img3_src_value);
    			attr_dev(img3, "class", "details svelte-az687v");
    			attr_dev(img3, "alt", "Background");
    			add_location(img3, file$5, 33, 4, 806);
    			attr_dev(section, "class", "svelte-az687v");
    			add_location(section, file$5, 24, 0, 404);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			if (if_block) if_block.m(section, null);
    			append_dev(section, t0);
    			append_dev(section, img0);
    			/*img0_binding*/ ctx[9](img0);
    			append_dev(section, t1);
    			append_dev(section, img1);
    			/*img1_binding*/ ctx[10](img1);
    			append_dev(section, t2);
    			append_dev(section, img2);
    			/*img2_binding*/ ctx[11](img2);
    			append_dev(section, t3);
    			append_dev(section, img3);
    			/*img3_binding*/ ctx[12](img3);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*scroll*/ ctx[0] >= 1) {
    				if (!if_block) {
    					if_block = create_if_block$2(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(section, t0);
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
    			/*img0_binding*/ ctx[9](null);
    			/*img1_binding*/ ctx[10](null);
    			/*img2_binding*/ ctx[11](null);
    			/*img3_binding*/ ctx[12](null);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	const dispatch = createEventDispatcher();
    	let { scroll } = $$props, { width } = $$props;
    	let kellyman, manIsDangerouslyCloseToTheEnd = false;
    	let vann;
    	let detailOne;
    	let detailTwo;
    	let details;
    	const writable_props = ["scroll", "width"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<KellyUnderwater> was created with unknown prop '${key}'`);
    	});

    	function img0_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(1, vann = $$value);
    		});
    	}

    	function img1_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(2, detailOne = $$value);
    		});
    	}

    	function img2_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(3, detailTwo = $$value);
    		});
    	}

    	function img3_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(4, details = $$value);
    		});
    	}

    	$$self.$set = $$props => {
    		if ("scroll" in $$props) $$invalidate(0, scroll = $$props.scroll);
    		if ("width" in $$props) $$invalidate(5, width = $$props.width);
    	};

    	$$self.$capture_state = () => {
    		return {
    			scroll,
    			width,
    			kellyman,
    			manIsDangerouslyCloseToTheEnd,
    			vann,
    			detailOne,
    			detailTwo,
    			details
    		};
    	};

    	$$self.$inject_state = $$props => {
    		if ("scroll" in $$props) $$invalidate(0, scroll = $$props.scroll);
    		if ("width" in $$props) $$invalidate(5, width = $$props.width);
    		if ("kellyman" in $$props) kellyman = $$props.kellyman;
    		if ("manIsDangerouslyCloseToTheEnd" in $$props) manIsDangerouslyCloseToTheEnd = $$props.manIsDangerouslyCloseToTheEnd;
    		if ("vann" in $$props) $$invalidate(1, vann = $$props.vann);
    		if ("detailOne" in $$props) $$invalidate(2, detailOne = $$props.detailOne);
    		if ("detailTwo" in $$props) $$invalidate(3, detailTwo = $$props.detailTwo);
    		if ("details" in $$props) $$invalidate(4, details = $$props.details);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*scroll*/ 1) {
    			 {
    				if (scroll >= 4000) {
    					dispatch("done");
    				}
    			}
    		}
    	};

    	return [
    		scroll,
    		vann,
    		detailOne,
    		detailTwo,
    		details,
    		width,
    		dispatch,
    		kellyman,
    		manIsDangerouslyCloseToTheEnd,
    		img0_binding,
    		img1_binding,
    		img2_binding,
    		img3_binding
    	];
    }

    class KellyUnderwater extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, { scroll: 0, width: 5 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "KellyUnderwater",
    			options,
    			id: create_fragment$5.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*scroll*/ ctx[0] === undefined && !("scroll" in props)) {
    			console.warn("<KellyUnderwater> was created without expected prop 'scroll'");
    		}

    		if (/*width*/ ctx[5] === undefined && !("width" in props)) {
    			console.warn("<KellyUnderwater> was created without expected prop 'width'");
    		}
    	}

    	get scroll() {
    		throw new Error("<KellyUnderwater>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set scroll(value) {
    		throw new Error("<KellyUnderwater>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get width() {
    		throw new Error("<KellyUnderwater>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set width(value) {
    		throw new Error("<KellyUnderwater>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
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
    const file$6 = "src/App.svelte";

    // (69:27) 
    function create_if_block_4$2(ctx) {
    	let current;

    	const kellyunderwater = new KellyUnderwater({
    			props: { scroll: /*y*/ ctx[1] },
    			$$inline: true
    		});

    	kellyunderwater.$on("done", /*changeScene*/ ctx[8]);

    	const block = {
    		c: function create() {
    			create_component(kellyunderwater.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(kellyunderwater, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const kellyunderwater_changes = {};
    			if (dirty & /*y*/ 2) kellyunderwater_changes.scroll = /*y*/ ctx[1];
    			kellyunderwater.$set(kellyunderwater_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(kellyunderwater.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(kellyunderwater.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(kellyunderwater, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4$2.name,
    		type: "if",
    		source: "(69:27) ",
    		ctx
    	});

    	return block;
    }

    // (67:27) 
    function create_if_block_3$2(ctx) {
    	let current;

    	const kellyworld = new KellyWorld({
    			props: { scroll: /*y*/ ctx[1] },
    			$$inline: true
    		});

    	kellyworld.$on("done", /*changeScene*/ ctx[8]);

    	const block = {
    		c: function create() {
    			create_component(kellyworld.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(kellyworld, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const kellyworld_changes = {};
    			if (dirty & /*y*/ 2) kellyworld_changes.scroll = /*y*/ ctx[1];
    			kellyworld.$set(kellyworld_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(kellyworld.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(kellyworld.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(kellyworld, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3$2.name,
    		type: "if",
    		source: "(67:27) ",
    		ctx
    	});

    	return block;
    }

    // (65:27) 
    function create_if_block_2$2(ctx) {
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
    		id: create_if_block_2$2.name,
    		type: "if",
    		source: "(65:27) ",
    		ctx
    	});

    	return block;
    }

    // (63:1) {#if sceneIndex == 0}
    function create_if_block_1$2(ctx) {
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
    		id: create_if_block_1$2.name,
    		type: "if",
    		source: "(63:1) {#if sceneIndex == 0}",
    		ctx
    	});

    	return block;
    }

    // (74:1) {#if w < 1100}
    function create_if_block$3(ctx) {
    	let div;
    	let h1;

    	const block = {
    		c: function create() {
    			div = element("div");
    			h1 = element("h1");
    			h1.textContent = "Best viewed on desktop";
    			add_location(h1, file$6, 75, 4, 2227);
    			attr_dev(div, "class", "message svelte-7b84a2");
    			add_location(div, file$6, 74, 2, 2201);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h1);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$3.name,
    		type: "if",
    		source: "(74:1) {#if w < 1100}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$6(ctx) {
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
    	let if_block0;
    	let t9;
    	let if_block1_anchor;
    	let current;
    	let dispose;
    	add_render_callback(/*onwindowscroll*/ ctx[10]);
    	add_render_callback(/*onwindowresize*/ ctx[11]);
    	const if_block_creators = [create_if_block_1$2, create_if_block_2$2, create_if_block_3$2, create_if_block_4$2];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*sceneIndex*/ ctx[0] == 0) return 0;
    		if (/*sceneIndex*/ ctx[0] == 1) return 1;
    		if (/*sceneIndex*/ ctx[0] == 2) return 2;
    		if (/*sceneIndex*/ ctx[0] == 3) return 3;
    		return -1;
    	}

    	if (~(current_block_type_index = select_block_type(ctx))) {
    		if_block0 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	}

    	let if_block1 = /*w*/ ctx[4] < 1100 && create_if_block$3(ctx);

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
    			if (if_block0) if_block0.c();
    			t9 = space();
    			if (if_block1) if_block1.c();
    			if_block1_anchor = empty();
    			add_location(span0, file$6, 54, 2, 1510);
    			add_location(span1, file$6, 54, 20, 1528);
    			add_location(span2, file$6, 55, 2, 1559);
    			add_location(span3, file$6, 55, 24, 1581);
    			add_location(span4, file$6, 56, 2, 1610);
    			add_location(span5, file$6, 56, 20, 1628);
    			attr_dev(div, "class", "status svelte-7b84a2");
    			add_location(div, file$6, 53, 1, 1487);
    			attr_dev(main, "class", "svelte-7b84a2");
    			add_location(main, file$6, 51, 0, 1435);
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

    			insert_dev(target, t9, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert_dev(target, if_block1_anchor, anchor);
    			current = true;

    			dispose = [
    				listen_dev(window_1, "keydown", /*handleKeydown*/ ctx[7], false, false, false),
    				listen_dev(window_1, "scroll", () => {
    					scrolling = true;
    					clearTimeout(scrolling_timeout);
    					scrolling_timeout = setTimeout(clear_scrolling, 100);
    					/*onwindowscroll*/ ctx[10]();
    				}),
    				listen_dev(window_1, "resize", /*onwindowresize*/ ctx[11])
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
    				if (if_block0) {
    					group_outros();

    					transition_out(if_blocks[previous_block_index], 1, 1, () => {
    						if_blocks[previous_block_index] = null;
    					});

    					check_outros();
    				}

    				if (~current_block_type_index) {
    					if_block0 = if_blocks[current_block_type_index];

    					if (!if_block0) {
    						if_block0 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    						if_block0.c();
    					}

    					transition_in(if_block0, 1);
    					if_block0.m(main, null);
    				} else {
    					if_block0 = null;
    				}
    			}

    			if (/*w*/ ctx[4] < 1100) {
    				if (!if_block1) {
    					if_block1 = create_if_block$3(ctx);
    					if_block1.c();
    					if_block1.m(if_block1_anchor.parentNode, if_block1_anchor);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block0);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);

    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].d();
    			}

    			if (detaching) detach_dev(t9);
    			if (if_block1) if_block1.d(detaching);
    			if (detaching) detach_dev(if_block1_anchor);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let warning = "";

    	//add scenes here
    	let scenes = ["climb", "jump", "kellyworld", "kellyunderwater"];

    	//current scene is..
    	let sceneIndex = 1;

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
    		console.log("scene index ", sceneIndex);

    		//reset scroll
    		$$invalidate(1, y = 0);

    		window.scrollTo(0, 0);

    		if (!isNaN(nr)) {
    			$$invalidate(0, sceneIndex = nr);
    			return;
    		}

    		$$invalidate(0, sceneIndex = sceneIndex == scenes.length
    		? 0
    		: parseInt(sceneIndex) + 1);

    		console.log("scene index " + sceneIndex);
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
    		if ("warning" in $$props) warning = $$props.warning;
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
    		warning,
    		onwindowscroll,
    		onwindowresize
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$6.name
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
