# Development workflow for hivtrace_viz

## Install using pip

> CAVEAT : It is highly recommended that you use a virtualenv for development

Please install gulp if you do not already have it
```
npm install -g gulp
```
```
pip install numpy
pip install biopython
pip install -e hivtrace
bower install
cd hivtrace/web
npm install
gulp
```

You should then be able to try the following command:
```
hivtrace_viz example.json
```
