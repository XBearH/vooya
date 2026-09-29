use vooya as voo;

#[derive(Default)]
pub struct Cart { count: u32 }

#[voo::store]
impl Cart {
    #[voo::action]
    pub fn add(&mut self, amount: u32) { self.count += amount; }

    #[voo::action]
    pub fn reset(&mut self) { self.count = 0; }

    #[voo::snapshot]
    pub fn snapshot(&self) -> u32 { self.count }
}
