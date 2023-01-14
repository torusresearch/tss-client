DKLS_PATH=$1
PKG_PATH=$(realpath $(dirname $0)/..)

if [ -z $DKLS_PATH ]; then echo "Please provide the path to the DKLS crate as the first argument."; exit 1; fi

echo "Upgrading DKLS for tss-lib"
echo "  DKLS path: $DKLS_PATH"
echo "  tss-lib path: $PKG_PATH"
echo "Continue? (Y/n)"
echo -ne "Y\r"
read CONTINUE

if [ "$CONTINUE" != Y -a -n "$CONTINUE" ]; then echo "Exiting"; exit 1; fi

(cd $DKLS_PATH && wasm-pack build --release --target web)

for FILE in dkls.js dkls.d.ts dkls_bg.wasm.d.ts dkls_bg.wasm
do
    SOURCE_FILE="$DKLS_PATH/pkg/$FILE"
    echo "Copying $SOURCE_FILE"
    cp $SOURCE_FILE $PKG_PATH
done

# Replace usage of import.meta.url. Necessary to make work for web worker.
sed -i '' -e "s/input = new URL('dkls_bg.wasm', import.meta.url);/throw new Error('unsupported');/g" "$PKG_PATH/dkls.js"
