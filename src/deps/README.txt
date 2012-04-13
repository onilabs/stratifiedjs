This directory contains external source code imported from external projects, from which we build modules in the Standard Module Library (apollo/modules).

In order to simplify code management, we deliberately *don't* use git submodules, but have the relevant source code checked in directly into the apollo repository.

To pull in updates from the external projects, you can use the utility 'fetch-external-deps' to replace the directories under deps/ with their corresponding github repositories. After rinning 'fetch-external-deps' you will be left with a separate git repository in each of the directories under deps/. You can then update from upstream by:
- cd'ing into the relevant directory 
- running 'git pull' 
- resolving merge conflicts
- updating the base revision in deps/sources.txt
- IMPORTANT: cd back into the apollo repo (i.e. deps/ or higher) 
- commit the changes to the apollo repo

