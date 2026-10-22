export class ResourceRegistry<T> {
  private registry: Record<string, T> = Object.create(null);
  private registeringDepth = 0;

  register(name: string, entry: T) {
    this.registry[name] = entry;
  }

  get(name: string) {
    return this.registry[name];
  }

  has(name: string) {
    return name in this.registry;
  }

  clear() {
    for (const key in this.registry)
      if (Object.prototype.hasOwnProperty.call(this.registry, key))
        delete this.registry[key];
    this.registeringDepth = 0;
  }

  getIsRegistering() {
    return this.registeringDepth > 0;
  }

  setIsRegistering(value: boolean) {
    if (value) {
      this.registeringDepth++;
    } else {
      this.registeringDepth = Math.max(0, this.registeringDepth - 1);
    }
  }

  getRegistry() {
    return this.registry;
  }
}
