#!/usr/bin/env python

import os, sys, tarfile, tempfile, shutil
from StringIO import StringIO

case = sys.argv[1]

f = StringIO()
tar = tarfile.open(fileobj=f, mode='w')
here = os.path.dirname(__file__)

sample_file = os.path.join(here, 'utf8.sjs')

if case == 'relative':
	tar.add(sample_file, arcname='../extracted')

if case == 'absolute':
	tar.add(sample_file, arcname='/tmp/extracted')

if case == 'symlink':
	tempdir = tempfile.mkdtemp()
	try:

		link = os.path.join(tempdir, 'link')
		os.symlink('/tmp', link)
		tar.add(link, arcname='link')
		tar.add(sample_file, arcname='link/extracted')
	finally:
		shutil.rmtree(tempdir)

sys.stdout.write(f.getvalue())
