// The component contract and implementation are ordinary Rust.
#[vooya::props]
#[derive(vooya::FromJs)]
pub struct RustScatterPlotProps {
    pub points: Option<usize>,
}

use std::{cell::RefCell, rc::Rc};

use wasm_bindgen::{closure::Closure, JsCast, JsValue};
use web_sys::{CanvasRenderingContext2d, Element, Event, HtmlCanvasElement, HtmlElement};

const WIDTH: u32 = 960;
const HEIGHT: u32 = 520;

#[derive(Clone, Copy)]
struct Point {
    x: f64,
    y: f64,
    group: u8,
}

struct ScatterState {
    points: Vec<Point>,
    zoom: f64,
}

pub struct Component {
    root: Element,
    state: Rc<RefCell<ScatterState>>,
    _handlers: Vec<Closure<dyn FnMut(Event)>>,
}

impl Component {
    pub fn update_points(&self, count: usize) {
        let mut state = self.state.borrow_mut();
        state.points = generate_points(count);
        draw(&self.root, &state);
    }

    pub fn dispose(&mut self) {
        self.root.remove();
    }
}

fn mount(context: MountContext) -> Result<Component, JsValue> {
    let document = context
        .host
        .owner_document()
        .ok_or_else(|| JsValue::from_str("Vooya mount host has no document"))?;
    let root = document.create_element("section")?;
    root.set_class_name("rust-scatter");
    root.set_attribute("data-vooya-island", "scatter-plot")?;
    root.set_inner_html(r#"
      <div class="scatter-toolbar">
        <strong>Rust / WASM canvas</strong>
        <span data-scatter-summary></span>
        <span class="scatter-actions">
          <button type="button" data-scatter-out aria-label="Zoom out">-</button>
          <button type="button" data-scatter-reset>Reset zoom</button>
          <button type="button" data-scatter-in aria-label="Zoom in">+</button>
        </span>
      </div>
      <canvas data-scatter-canvas width="960" height="520" aria-label="Scatter plot canvas"></canvas>
    "#);
    context.host.append_child(&root)?;

    let state = Rc::new(RefCell::new(ScatterState {
        points: generate_points(context.props.points),
        zoom: 1.0,
    }));
    draw(&root, &state.borrow());

    let mut handlers = Vec::new();
    for (selector, multiplier) in [("[data-scatter-out]", 0.75), ("[data-scatter-in]", 1.25)] {
        let button: HtmlElement = root
            .query_selector(selector)?
            .ok_or_else(|| JsValue::from_str("Scatter control is missing"))?
            .dyn_into()?;
        let action_root = root.clone();
        let action_state = state.clone();
        let handler = Closure::new(move |_event: Event| {
            let mut state = action_state.borrow_mut();
            state.zoom = (state.zoom * multiplier).clamp(0.45, 5.0);
            draw(&action_root, &state);
        });
        button.add_event_listener_with_callback("click", handler.as_ref().unchecked_ref())?;
        handlers.push(handler);
    }

    let reset: HtmlElement = root
        .query_selector("[data-scatter-reset]")?
        .ok_or_else(|| JsValue::from_str("Scatter reset is missing"))?
        .dyn_into()?;
    let reset_root = root.clone();
    let reset_state = state.clone();
    let reset_handler = Closure::new(move |_event: Event| {
        let mut state = reset_state.borrow_mut();
        state.zoom = 1.0;
        draw(&reset_root, &state);
    });
    reset.add_event_listener_with_callback("click", reset_handler.as_ref().unchecked_ref())?;
    handlers.push(reset_handler);

    Ok(Component {
        root,
        state,
        _handlers: handlers,
    })
}

fn generate_points(count: usize) -> Vec<Point> {
    let mut seed = 0x9e37_79b9_u32;
    (0..count)
        .map(|index| {
            seed = seed.wrapping_mul(1_664_525).wrapping_add(1_013_904_223);
            let jitter_x = (seed as f64 / u32::MAX as f64) - 0.5;
            seed = seed.wrapping_mul(1_664_525).wrapping_add(1_013_904_223);
            let jitter_y = (seed as f64 / u32::MAX as f64) - 0.5;
            let group = (index % 3) as u8;
            let center_x = [0.30, 0.55, 0.74][group as usize];
            let center_y = [0.65, 0.35, 0.60][group as usize];
            Point {
                x: center_x + jitter_x * 0.30,
                y: center_y + jitter_y * 0.36,
                group,
            }
        })
        .collect()
}

fn draw(root: &Element, state: &ScatterState) {
    let Ok(Some(canvas)) = root.query_selector("[data-scatter-canvas]") else {
        return;
    };
    let Ok(canvas) = canvas.dyn_into::<HtmlCanvasElement>() else {
        return;
    };
    let Ok(Some(context)) = canvas.get_context("2d") else {
        return;
    };
    let Ok(context) = context.dyn_into::<CanvasRenderingContext2d>() else {
        return;
    };
    let width = WIDTH as f64;
    let height = HEIGHT as f64;
    context.set_fill_style_str("#ffffff");
    context.fill_rect(0.0, 0.0, width, height);
    context.set_stroke_style_str("#dce5e7");
    for position in [0.25, 0.5, 0.75] {
        context.begin_path();
        context.move_to(position * width, 0.0);
        context.line_to(position * width, height);
        context.stroke();
    }
    let colors = [
        "rgba(20, 111, 105, 0.24)",
        "rgba(38, 107, 185, 0.22)",
        "rgba(202, 91, 44, 0.20)",
    ];
    for group in 0..3_u8 {
        context.set_fill_style_str(colors[group as usize]);
        for point in state.points.iter().filter(|point| point.group == group) {
            let x = ((point.x - 0.5) * state.zoom + 0.5) * width;
            let y = ((point.y - 0.5) * state.zoom + 0.5) * height;
            if x >= 0.0 && x < width && y >= 0.0 && y < height {
                context.fill_rect(x, y, 1.8, 1.8);
            }
        }
    }
    if let Ok(Some(summary)) = root.query_selector("[data-scatter-summary]") {
        summary.set_text_content(Some(&format!(
            "{} points | {:.0}% zoom",
            state.points.len(),
            state.zoom * 100.0
        )));
    }
    let _ = canvas.set_attribute(
        "aria-label",
        &format!(
            "Scatter plot with {} points at {:.0}% zoom",
            state.points.len(),
            state.zoom * 100.0
        ),
    );
}

struct MountProps {
    points: usize,
}

struct MountContext {
    host: web_sys::Element,
    props: MountProps,
}

thread_local! {
    static MOUNTED: std::cell::RefCell<Vec<Option<Component>>> = const { std::cell::RefCell::new(Vec::new()) };
}

#[vooya::component(update = "update_rust_scatter_plot")]
#[vooya::style("./RustScatterPlot.css", scoped)]
pub fn RustScatterPlot(
    view: &vooya::View,
    props: RustScatterPlotProps,
) -> Result<vooya::ViewElement, wasm_bindgen::JsValue> {
    let root = view
        .element("div")?
        .attribute("style", "display: contents")?;
    let cleanup = vooya::MountCleanup::default();
    let context = MountContext {
        host: root.as_element().clone(),
        props: MountProps {
            points: props.points.unwrap_or(150000),
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

fn update_rust_scatter_plot(
    root: &vooya::ViewElement,
    props: RustScatterPlotProps,
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
        component.update_points(props.points.unwrap_or(150000));
        Ok(())
    })
}
