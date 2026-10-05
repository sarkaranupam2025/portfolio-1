"""Package the deliverables into download/.

  anupam-sarkar-portfolio-ALL-IN-ONE.html   single file, everything embedded
  anupam-sarkar-portfolio.html              portfolio only (needs site/*.html beside it)
  anupam-sarkar-portfolio-site.zip          site/ + cms/ + backend/, ready to deploy

The zip is the real deliverable: it contains the admin, the runtime, the generated
content model and the optional backend, which the two single files deliberately do
not. build/ is excluded — clone the repo for the generators and tests.
"""
import os
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, 'site')
CMS = os.path.join(ROOT, 'cms')
BACKEND = os.path.join(ROOT, 'backend')
OUT = os.path.join(ROOT, 'download')

KEEP = {
    SITE: ('index.html', 'smart-mining-case-study.html', 'falcon-view-case-study.html',
           'incident-management-case-study.html', 'bt-billing-case-study.html',
           '.nojekyll', 'README.md'),
    CMS: ('admin.html', 'admin.js', 'cms-runtime.js', 'content.js', '_schema.part.js',
          '_content.json', '_data.json', '_svgs.json', 'README.md'),
    BACKEND: ('auth.js', 'content.js', 'lib.js', 'README.md'),
}

README_TXT = '''Anupam Sarkar - portfolio, case studies and CMS
================================================

Open site/index.html to see the portfolio.
Open cms/admin.html to edit it.

    username  asarkar57
    password  123!@#Aps

Those are seeded defaults printed on the login screen until you change them
(Settings & security -> Admin account). With no backend they are not real
security: the admin is a static file anyone can download. See cms/README.md.

The CMS needs http:// for its live preview and for content.json:

    python3 -m http.server 8000
    http://localhost:8000/site/index.html
    http://localhost:8000/cms/admin.html

Docs:  cms/README.md (the CMS)  -  backend/README.md (real authentication)
Tests: cd build && npm install && npm test
'''


def main():
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, 'anupam-sarkar-portfolio-site.zip')
    count = 0
    with zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as z:
        for folder, names in KEEP.items():
            arc = os.path.basename(folder)
            for name in names:
                src = os.path.join(folder, name)
                if not os.path.exists(src):
                    print('   missing, skipped: %s/%s' % (arc, name))
                    continue
                z.write(src, arc + '/' + name)
                count += 1
        z.writestr('site/content.json',
                   '{\n  "_note": "Published by cms/admin.html. Only keys that differ '
                   'from the shipped defaults appear here.",\n  "content": {},\n  "design": {}\n}\n')
        z.writestr('README.txt', README_TXT)
        count += 2

    print('wrote %s' % path)
    print('  %d files, %.2f MB' % (count, os.path.getsize(path) / 1048576))
    for f in sorted(os.listdir(OUT)):
        print('  %-46s %6.2f MB' % (f, os.path.getsize(os.path.join(OUT, f)) / 1048576))


if __name__ == '__main__':
    main()
