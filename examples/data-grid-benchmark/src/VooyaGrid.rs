// The component contract and implementation are ordinary Rust.
#[vooya::props]
#[derive(vooya::FromJs)]
pub struct VooyaGridProps {
    pub rows: Option<usize>,
}

use std::{cell::RefCell, rc::Rc};

use wasm_bindgen::{closure::Closure, JsCast, JsValue};
use web_sys::{Element, Event, HtmlElement, HtmlInputElement};

const ROW_HEIGHT: i32 = 28;
const WINDOW_SIZE: usize = 24;
const BENCHMARK_ROUNDS: usize = 20;
const BENCHMARK_QUERIES: [&str; 20] = [
    "item-000", "item-001", "item-010", "item-011", "item-020", "item-021", "item-030", "item-031",
    "item-040", "item-041", "item-050", "item-051", "item-060", "item-061", "item-070", "item-071",
    "item-080", "item-081", "item-090", "item-091",
];

struct Row {
    id: usize,
    name: String,
    score: u32,
}

struct GridState {
    rows: Vec<Row>,
    visible: Vec<usize>,
    query: String,
    descending: bool,
    start: usize,
    selected: Option<usize>,
    benchmark: Option<(f64, f64)>,
}

impl GridState {
    fn new(row_count: usize) -> Self {
        let rows = (0..row_count)
            .map(|id| Row {
                id,
                name: format!("item-{id:06}"),
                score: ((id as u32).wrapping_mul(17)) % 100_003,
            })
            .collect::<Vec<_>>();
        let visible = (0..rows.len()).collect();
        let mut state = Self {
            rows,
            visible,
            query: String::new(),
            descending: false,
            start: 0,
            selected: None,
            benchmark: None,
        };
        state.refresh();
        state
    }

    fn refresh(&mut self) {
        self.visible = self
            .rows
            .iter()
            .filter(|row| row.name.contains(&self.query))
            .map(|row| row.id)
            .collect();
        self.visible.sort_unstable_by_key(|id| self.rows[*id].score);
        if self.descending {
            self.visible.reverse();
        }
        self.start = self.start.min(self.visible.len().saturating_sub(1));
    }
}

pub struct Component {
    root: Element,
    state: Rc<RefCell<GridState>>,
    _handlers: Vec<Closure<dyn FnMut(Event)>>,
}

impl Component {
    pub fn update_rows(&self, row_count: usize) {
        let mut state = self.state.borrow_mut();
        *state = GridState::new(row_count);
        render(&self.root, &state);
    }

    pub fn dispose(&mut self) {
        self.root.remove();
    }
}

fn mount(context: MountContext) -> Result<Component, JsValue> {
    let host = context.host;
    let row_count = context.props.rows;
    let document = host
        .owner_document()
        .ok_or_else(|| JsValue::from_str("Vooya mount host has no document"))?;
    let root = document.create_element("section")?;
    root.set_class_name("vooya-data-grid");
    root.set_attribute("data-vooya-island", "data-grid")?;
    root.set_inner_html(
        r#"
        <div class="vooya-grid-toolbar">
          <input aria-label="Filter Vooya rows" data-vooya-filter placeholder="Filter rows">
          <button data-vooya-sort>Sort score</button>
          <button data-vooya-benchmark>Run filter benchmark</button>
          <output data-vooya-summary></output>
        </div>
        <div class="vooya-grid-viewport" data-vooya-viewport>
          <div class="vooya-grid-spacer" data-vooya-spacer></div>
          <div class="vooya-grid-rows" data-vooya-rows></div>
        </div>
        "#,
    );
    host.append_child(&root)?;

    let state = Rc::new(RefCell::new(GridState::new(row_count)));
    render(&root, &state.borrow());

    let filter: HtmlInputElement = root
        .query_selector("[data-vooya-filter]")?
        .ok_or_else(|| JsValue::from_str("Vooya grid filter is missing"))?
        .dyn_into()?;
    let input_root = root.clone();
    let input_state = state.clone();
    let input_handler = Closure::new(move |event: Event| {
        let Some(input) = event
            .target()
            .and_then(|target| target.dyn_into::<HtmlInputElement>().ok())
        else {
            return;
        };
        let mut state = input_state.borrow_mut();
        state.query = input.value();
        state.refresh();
        render(&input_root, &state);
    });
    filter.add_event_listener_with_callback("input", input_handler.as_ref().unchecked_ref())?;

    let sort: HtmlElement = root
        .query_selector("[data-vooya-sort]")?
        .ok_or_else(|| JsValue::from_str("Vooya grid sort button is missing"))?
        .dyn_into()?;
    let sort_root = root.clone();
    let sort_state = state.clone();
    let sort_handler = Closure::new(move |_event: Event| {
        let mut state = sort_state.borrow_mut();
        state.descending = !state.descending;
        state.refresh();
        render(&sort_root, &state);
    });
    sort.add_event_listener_with_callback("click", sort_handler.as_ref().unchecked_ref())?;

    let benchmark: HtmlElement = root
        .query_selector("[data-vooya-benchmark]")?
        .ok_or_else(|| JsValue::from_str("Vooya grid benchmark button is missing"))?
        .dyn_into()?;
    let benchmark_root = root.clone();
    let benchmark_state = state.clone();
    let benchmark_handler = Closure::new(move |_event: Event| {
        let mut samples = Vec::with_capacity(BENCHMARK_ROUNDS);
        for _ in 0..BENCHMARK_ROUNDS {
            let started = js_sys::Date::now();
            for query in BENCHMARK_QUERIES {
                let mut state = benchmark_state.borrow_mut();
                state.query = query.to_owned();
                state.refresh();
                render(&benchmark_root, &state);
            }
            samples.push(js_sys::Date::now() - started);
        }
        samples.sort_by(|left, right| left.total_cmp(right));
        let mut state = benchmark_state.borrow_mut();
        state.benchmark = Some((
            samples[BENCHMARK_ROUNDS / 2],
            samples[BENCHMARK_ROUNDS * 95 / 100],
        ));
        render(&benchmark_root, &state);
    });
    benchmark
        .add_event_listener_with_callback("click", benchmark_handler.as_ref().unchecked_ref())?;

    let viewport: HtmlElement = root
        .query_selector("[data-vooya-viewport]")?
        .ok_or_else(|| JsValue::from_str("Vooya grid viewport is missing"))?
        .dyn_into()?;
    let scroll_root = root.clone();
    let scroll_state = state.clone();
    let scroll_handler = Closure::new(move |event: Event| {
        let Some(viewport) = event
            .target()
            .and_then(|target| target.dyn_into::<HtmlElement>().ok())
        else {
            return;
        };
        let mut state = scroll_state.borrow_mut();
        state.start = (viewport.scroll_top() / ROW_HEIGHT).max(0) as usize;
        render(&scroll_root, &state);
    });
    viewport.add_event_listener_with_callback("scroll", scroll_handler.as_ref().unchecked_ref())?;

    Ok(Component {
        root,
        state,
        _handlers: vec![
            input_handler,
            sort_handler,
            benchmark_handler,
            scroll_handler,
        ],
    })
}

fn render(root: &Element, state: &GridState) {
    let total = state.visible.len();
    let start = state.start.min(total.saturating_sub(1));
    let end = (start + WINDOW_SIZE).min(total);
    let rows = state.visible[start..end]
        .iter()
        .map(|id| {
            let row = &state.rows[*id];
            let selected = (state.selected == Some(row.id))
                .then_some(" data-selected")
                .unwrap_or("");
            format!(
                "<div class=\"vooya-grid-row\"{selected}><span>{}</span><span>{}</span></div>",
                row.name, row.score
            )
        })
        .collect::<String>();

    if let Ok(Some(summary)) = root.query_selector("[data-vooya-summary]") {
        let text = match state.benchmark {
            Some((median, p95)) => format!(
                "{total} matching | 20 filter/sort/render ops x{BENCHMARK_ROUNDS}: median {median:.1} ms, p95 {p95:.1} ms"
            ),
            None => format!("{total} matching rows"),
        };
        summary.set_text_content(Some(&text));
    }
    if let Ok(Some(spacer)) = root.query_selector("[data-vooya-spacer]") {
        let _ = spacer.set_attribute("style", &format!("height: {}px", total as i32 * ROW_HEIGHT));
    }
    if let Ok(Some(container)) = root.query_selector("[data-vooya-rows]") {
        let _ = container.set_attribute(
            "style",
            &format!("transform: translateY({}px)", start as i32 * ROW_HEIGHT),
        );
        container.set_inner_html(&rows);
    }
}

struct MountProps {
    rows: usize,
}

struct MountContext {
    host: web_sys::Element,
    props: MountProps,
}

thread_local! {
    static MOUNTED: std::cell::RefCell<Vec<Option<Component>>> = const { std::cell::RefCell::new(Vec::new()) };
}

#[vooya::component(update = "update_vooya_grid")]
pub fn VooyaGrid(
    view: &vooya::View,
    props: VooyaGridProps,
) -> Result<vooya::ViewElement, wasm_bindgen::JsValue> {
    let root = view
        .element("div")?
        .attribute("style", "display: contents")?;
    let cleanup = vooya::MountCleanup::default();
    let context = MountContext {
        host: root.as_element().clone(),
        props: MountProps {
            rows: props.rows.unwrap_or(100000),
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

fn update_vooya_grid(
    root: &vooya::ViewElement,
    props: VooyaGridProps,
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
        component.update_rows(props.rows.unwrap_or(100000));
        Ok(())
    })
}
