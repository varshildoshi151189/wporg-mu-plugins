/* global FileReader */
/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { useEffect, useRef, useState } from '@wordpress/element';

/**
 * Module constants
 */
const MAX_ATTEMPTS = 10;
const RETRY_DELAY = 1000;

/**
 * Thanks! https://overreacted.io/making-setinterval-declarative-with-react-hooks/.
 *
 * @param {Function} callback
 * @param {number}   delay
 */
function useInterval( callback, delay ) {
	const savedCallback = useRef();

	useEffect( () => {
		savedCallback.current = callback;
	}, [ callback ] );

	useEffect( () => {
		function tick() {
			savedCallback.current();
		}
		if ( delay !== null ) {
			const id = setInterval( tick, delay );
			return () => clearInterval( id );
		}
	}, [ delay ] );
}

/**
 *
 * We are using mShots which is a project that generates a screenshot from a webpage.
 * Since the screenshot generation takes some time, for never seen websites,
 * we need to do some custom handling.
 *
 * @param {Object}  props
 * @param {string}  props.src     The url of the screenshot
 * @param {boolean} props.isReady Whether we should start try to show the image.
 *
 * @return {Object} React component
 */
function ScreenShotImg( { src, isReady = false } ) {
	const fullUrl = `https://s0.wp.com/mshots/v1/${ encodeURIComponent( src ) }`;

	const [ attempts, setAttempts ] = useState( 0 );
	const [ hasLoaded, setHasLoaded ] = useState( false );
	const [ hasError, setHasError ] = useState( false );
	const [ base64Img, setBase64Img ] = useState( '' );

	// We don't want to keep trying infinitely.
	const hasAborted = attempts > MAX_ATTEMPTS;

	// The derived loading state
	const isLoading = isReady && ! hasLoaded && ! hasAborted && ! hasError;

	/**
	 * Since we already made the request, we'll use the response to be frugal.
	 *
	 * @param {string} res
	 */
	const convertResponseToBase64 = async ( res ) => {
		const blob = await res.blob();

		const reader = new FileReader();
		reader.onload = ( event ) => {
			setBase64Img( event.target.result );
		};
		reader.readAsDataURL( blob );
	};

	/**
	 * The Snapshot service will redirect when its generating an image.
	 * We want to continue requesting the image until it doesn't redirect.
	 */
	useInterval(
		async () => {
			try {
				const res = await fetch( fullUrl );

				if ( res.status === 200 && ! res.redirected ) {
					await convertResponseToBase64( res );

					setHasLoaded( true );
				} else {
					setAttempts( attempts + 1 );
				}
			} catch ( error ) {
				setHasError( true );
			}
		},
		isLoading ? RETRY_DELAY : null
	);

	if ( ! isReady ) {
		return null;
	}

	if ( isLoading ) {
		return <div className="wporg-screenshot wporg-screenshot__loading">{ __( 'Loading …', 'wporg' ) }</div>;
	}

	if ( hasError || hasAborted ) {
		return <div className="wporg-screenshot wporg-screenshot__has-error">{ __( 'error', 'wporg' ) }</div>;
	}

	return <img src={ base64Img } alt="" />;
}

export default ScreenShotImg;
