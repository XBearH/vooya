// The component contract and implementation are ordinary Rust.
#[vooya::props]
#[derive(vooya::FromJs)]
pub struct TraceWaterfallProps {
    pub spans: Option<usize>,
}

use std::{cell::RefCell, rc::Rc};

use wasm_bindgen::{closure::Closure, JsCast, JsValue};
use web_sys::{Element, Event, HtmlElement, HtmlSelectElement};

const WINDOW: usize = 56;
const FOCUS_LEAD_ROWS: usize = 7;
const ROUNDS: usize = 12;
const SERVICES: [&str; 4] = ["api", "auth", "catalog", "checkout"];

struct Span {
    id: usize,
    service: &'static str,
    name: String,
    start: u32,
    duration: u32,
}
struct State {
    spans: Vec<Span>,
    service: String,
    zoom: f64,
    start: usize,
    critical: usize,
    benchmark: Option<(f64, f64)>,
}

impl State {
    fn new(count: usize) -> Self {
        let spans = (0..count)
            .map(|id| {
                let service = SERVICES[id % SERVICES.len()];
                let start = ((id * 37) % 1200) as u32;
                let duration = 8 + ((id * 29) % 170) as u32 + if id == count / 2 { 760 } else { 0 };
                Span {
                    id,
                    service,
                    name: format!("{service}.operation.{}", id % 48),
                    start,
                    duration,
                }
            })
            .collect::<Vec<_>>();
        let critical = spans
            .iter()
            .enumerate()
            .max_by_key(|(_, span)| span.duration)
            .map(|(index, _)| index)
            .unwrap_or(0);
        Self {
            spans,
            service: "all".to_owned(),
            zoom: 1.0,
            start: 0,
            critical,
            benchmark: None,
        }
    }
    fn visible(&self) -> Vec<&Span> {
        self.spans
            .iter()
            .filter(|span| self.service == "all" || span.service == self.service)
            .collect()
    }
}

pub struct Component {
    root: Element,
    state: Rc<RefCell<State>>,
    _handlers: Vec<Closure<dyn FnMut(Event)>>,
}
impl Component {
    pub fn update_spans(&self, count: usize) {
        let mut state = self.state.borrow_mut();
        *state = State::new(count);
        render(&self.root, &state);
    }
    pub fn dispose(&mut self) {
        self.root.remove();
    }
}

fn mount(context: MountContext) -> Result<Component, JsValue> {
    let document = context
        .host
        .owner_document()
        .ok_or_else(|| JsValue::from_str("Trace host has no document"))?;
    let root = document.create_element("section")?;
    root.set_class_name("trace-waterfall");
    root.set_attribute("data-vooya-island", "trace-waterfall")?;
    root.set_inner_html(r#"<div class="trace-toolbar"><label>Service <select aria-label="Filter WASM services" data-service><option value="all">All services</option><option value="api">api</option><option value="auth">auth</option><option value="catalog">catalog</option><option value="checkout">checkout</option></select></label><button data-out aria-label="Zoom out">−</button><button data-reset>Reset zoom</button><button data-in aria-label="Zoom in">+</button><button data-critical>Focus critical path</button><button data-benchmark>Measure workload</button></div><output data-summary></output><div class="trace-axis"><span>0 ms</span><span>600 ms</span><span>1200 ms</span></div><div class="trace-viewport" data-viewport><div data-spacer><div data-rows></div></div></div>"#);
    context.host.append_child(&root)?;
    let state = Rc::new(RefCell::new(State::new(context.props.spans)));
    render(&root, &state.borrow());
    let mut handlers = Vec::new();
    let service: HtmlSelectElement = root
        .query_selector("[data-service]")?
        .ok_or_else(|| JsValue::from_str("Trace service control missing"))?
        .dyn_into()?;
    let handler_root = root.clone();
    let handler_state = state.clone();
    let handler = Closure::new(move |event: Event| {
        if let Some(input) = event
            .target()
            .and_then(|value| value.dyn_into::<HtmlSelectElement>().ok())
        {
            let mut state = handler_state.borrow_mut();
            state.service = input.value();
            state.start = 0;
            render(&handler_root, &state);
        }
    });
    service.add_event_listener_with_callback("input", handler.as_ref().unchecked_ref())?;
    handlers.push(handler);
    for (selector, factor) in [("[data-out]", 0.75), ("[data-in]", 1.25)] {
        let button: HtmlElement = root
            .query_selector(selector)?
            .ok_or_else(|| JsValue::from_str("Trace zoom control missing"))?
            .dyn_into()?;
        let action_root = root.clone();
        let action_state = state.clone();
        let action = Closure::new(move |_event: Event| {
            let mut state = action_state.borrow_mut();
            state.zoom = (state.zoom * factor).clamp(0.5, 3.0);
            render(&action_root, &state);
        });
        button.add_event_listener_with_callback("click", action.as_ref().unchecked_ref())?;
        handlers.push(action);
    }
    let reset: HtmlElement = root
        .query_selector("[data-reset]")?
        .ok_or_else(|| JsValue::from_str("Trace reset missing"))?
        .dyn_into()?;
    let reset_root = root.clone();
    let reset_state = state.clone();
    let reset_handler = Closure::new(move |_event: Event| {
        let mut state = reset_state.borrow_mut();
        state.zoom = 1.0;
        render(&reset_root, &state);
    });
    reset.add_event_listener_with_callback("click", reset_handler.as_ref().unchecked_ref())?;
    handlers.push(reset_handler);
    let critical: HtmlElement = root
        .query_selector("[data-critical]")?
        .ok_or_else(|| JsValue::from_str("Trace critical control missing"))?
        .dyn_into()?;
    let critical_root = root.clone();
    let critical_state = state.clone();
    let critical_handler = Closure::new(move |_event: Event| {
        let mut state = critical_state.borrow_mut();
        state.service = "all".to_owned();
        state.start = state.critical.saturating_sub(FOCUS_LEAD_ROWS);
        let offset = (state.start * 25) as i32;
        render(&critical_root, &state);
        if let Ok(Some(viewport)) = critical_root.query_selector("[data-viewport]") {
            if let Ok(viewport) = viewport.dyn_into::<HtmlElement>() {
                viewport.set_scroll_top(offset);
            }
        }
    });
    critical
        .add_event_listener_with_callback("click", critical_handler.as_ref().unchecked_ref())?;
    handlers.push(critical_handler);
    let benchmark: HtmlElement = root
        .query_selector("[data-benchmark]")?
        .ok_or_else(|| JsValue::from_str("Trace benchmark missing"))?
        .dyn_into()?;
    let benchmark_root = root.clone();
    let benchmark_state = state.clone();
    let benchmark_handler = Closure::new(move |_event: Event| {
        let mut samples = Vec::new();
        for service in ["all", "api", "auth", "catalog"] {
            let start = js_sys::Date::now();
            for _ in 0..ROUNDS {
                let mut state = benchmark_state.borrow_mut();
                state.service = service.to_owned();
                state.start = 0;
                render(&benchmark_root, &state);
            }
            samples.push(js_sys::Date::now() - start);
        }
        samples.sort_by(|a, b| a.total_cmp(b));
        let mut state = benchmark_state.borrow_mut();
        state.service = "all".to_owned();
        state.benchmark = Some((
            samples[samples.len() / 2],
            samples[samples.len() * 95 / 100],
        ));
        render(&benchmark_root, &state);
    });
    benchmark
        .add_event_listener_with_callback("click", benchmark_handler.as_ref().unchecked_ref())?;
    handlers.push(benchmark_handler);
    let viewport: HtmlElement = root
        .query_selector("[data-viewport]")?
        .ok_or_else(|| JsValue::from_str("Trace viewport missing"))?
        .dyn_into()?;
    let scroll_root = root.clone();
    let scroll_state = state.clone();
    let scroll_handler = Closure::new(move |event: Event| {
        if let Some(viewport) = event
            .target()
            .and_then(|value| value.dyn_into::<HtmlElement>().ok())
        {
            let mut state = scroll_state.borrow_mut();
            state.start = (viewport.scroll_top() / 25).max(0) as usize;
            render(&scroll_root, &state);
        }
    });
    viewport.add_event_listener_with_callback("scroll", scroll_handler.as_ref().unchecked_ref())?;
    handlers.push(scroll_handler);
    Ok(Component {
        root,
        state,
        _handlers: handlers,
    })
}

fn render(root: &Element, state: &State) {
    let visible = state.visible();
    let total = visible.len();
    let start = state.start.min(total.saturating_sub(1));
    let end = (start + WINDOW).min(total);
    let rows = visible[start..end].iter().map(|span| { let left = span.start as f64 / 12.0 * state.zoom; let width = (span.duration as f64 / 12.0 * state.zoom).max(2.0); let critical = (span.id == state.critical).then_some(" critical").unwrap_or(""); format!("<div class=\"trace-row{critical}\"><span class=\"trace-name\">{} · {}</span><span class=\"trace-bar\" style=\"margin-left:{left:.1}%;width:{width:.1}%\" title=\"{} ms\"></span></div>", span.service, span.name, span.duration) }).collect::<String>();
    if let Ok(Some(summary)) = root.query_selector("[data-summary]") {
        let text = match state.benchmark { Some((median, p95)) => format!("{total} matching spans | 4 service filters x{ROUNDS}: median {median:.1} ms, p95 {p95:.1} ms"), None => format!("{total} matching spans | {:.0}% zoom | critical path {} ms", state.zoom * 100.0, state.spans[state.critical].duration) };
        summary.set_text_content(Some(&text));
    }
    if let Ok(Some(spacer)) = root.query_selector("[data-spacer]") {
        let _ = spacer.set_attribute("style", &format!("height:{}px", total * 25));
    }
    if let Ok(Some(container)) = root.query_selector("[data-rows]") {
        let _ =
            container.set_attribute("style", &format!("transform: translateY({}px)", start * 25));
        container.set_inner_html(&rows);
    }
}

struct MountProps {
    spans: usize,
}

struct MountContext {
    host: web_sys::Element,
    props: MountProps,
}

thread_local! {
    static MOUNTED: std::cell::RefCell<Vec<Option<Component>>> = const { std::cell::RefCell::new(Vec::new()) };
}

#[vooya::component(update = "update_trace_waterfall")]
#[vooya::style("./TraceWaterfall.css", scoped)]
pub fn TraceWaterfall(
    view: &vooya::View,
    props: TraceWaterfallProps,
) -> Result<vooya::ViewElement, wasm_bindgen::JsValue> {
    let root = view
        .element("div")?
        .attribute("style", "display: contents")?;
    let cleanup = vooya::MountCleanup::default();
    let context = MountContext {
        host: root.as_element().clone(),
        props: MountProps {
            spans: props.spans.unwrap_or(12000),
        },
    };
    let component = match mount(context) {
        Ok(component) => component,
        Err(cause) => {
            cleanup.run();
            root.remove();
            return Err(cause);
        }
    };
    cleanup.disarm();
    let handle = MOUNTED.with(|mounted| {
        let mut mounted = mounted.borrow_mut();
        if let Some(handle) = mounted.iter().position(Option::is_none) {
            mounted[handle] = Some(component);
            handle
        } else {
            mounted.push(Some(component));
            mounted.len() - 1
        }
    });
    root.as_element()
        .set_attribute("data-example-handle", &handle.to_string())?;
    root.defer_cleanup(move || {
        let component =
            MOUNTED.with(|mounted| mounted.borrow_mut().get_mut(handle).and_then(Option::take));
        if let Some(mut component) = component {
            component.dispose();
        }
    });
    Ok(root)
}

fn update_trace_waterfall(
    root: &vooya::ViewElement,
    props: TraceWaterfallProps,
) -> Result<(), wasm_bindgen::JsValue> {
    let handle = root
        .as_element()
        .get_attribute("data-example-handle")
        .and_then(|value| value.parse::<usize>().ok())
        .ok_or_else(|| wasm_bindgen::JsValue::from_str("missing example instance"))?;
    MOUNTED.with(|mounted| {
        let mounted = mounted.borrow();
        let component = mounted
            .get(handle)
            .and_then(Option::as_ref)
            .ok_or_else(|| wasm_bindgen::JsValue::from_str("disposed example instance"))?;
        component.update_spans(props.spans.unwrap_or(12000));
        Ok(())
    })
}
