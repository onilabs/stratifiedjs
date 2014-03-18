/*
 * C1 SJS -> StratifiedJS VM compiler kernel 
 *
 * Part of StratifiedJS
 * http://onilabs.com/stratifiedjs
 *
 * (c) 2011 Oni Labs, http://onilabs.com
 *
 * This file is licensed under the terms of the GPL v2, see
 * http://www.gnu.org/licenses/gpl-2.0.html
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
*/
/**
   @module  compile/sjs
   @executable
   @summary SJS Compiler
   @home    sjs:compile/sjs

   @function compile
   @summary  Compile a string of SJS source code into JavaScript
   @param    {String} [src]
   @param    {optional Object} [settings]
   @setting  {String} [filename]
   @return   {String} Compiled JavaScript


@docsoff */
exports.compile = __oni_rt.c1.compile;
if (require.main === module) {
	var seq = require('sjs:sequence'), fs = require('sjs:nodejs/fs');
	require('sjs:sys').argv() .. seq.each {|f|
		var filename = JSON.stringify(f);
		fs.readFile(f, 'utf-8') .. exports.compile({globalReturn: true, filename: filename, keeplines: true}) .. console.log
	}
}
