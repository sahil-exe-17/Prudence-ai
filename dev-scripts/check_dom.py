import os
for path in ['index.html', 'localhost/index.html']:
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            t = f.read()
            print(f'{path}: viewer = {"viewer" in t}, preview = {"preview" in t}')
